
<template>
    <div class="upload-container">
            <!-- :custom-request="customRequest"  -->
        <n-upload 
            v-bind="$attrs" 
            :accept="accept"
            :directory="isDirectory"
            :on-before-upload="handleBeforeUpload"
            style="width: 200px;"
        >
            <n-upload-dragger>
                <div style="margin-bottom: 12px">
                    <n-icon size="48" :depth="3">
                        <cloudUpload-sharp></cloudUpload-sharp>
                    </n-icon>
                </div>
                <n-text style="font-size: 16px">拖拽文件上传</n-text>
                <n-p v-if="Object.hasOwn($attrs, 'multiple') && $attrs.multiple !== false" depth="3" style="margin: 8px 0 0 0">可拖拽多个文件</n-p>
            </n-upload-dragger>
            <div
                class="upload-trigger"
                @click="(e) => { e.preventDefault(); e.stopPropagation(); return false}"
            >
                <n-upload-trigger #="{ handleClick }" abstract>
                    <n-button type="primary" class="upload-btn" @click="onDirBtnClick(handleClick)">上传文件夹</n-button>
                </n-upload-trigger>
            </div>
        </n-upload>

        <!-- 文件列表 -->
        <n-scrollbar style="max-height: 220px; flex:1;" class="file-list-box">
            <n-spin :show="loading">
                <div class="file-item" v-for="file in fileList" :key="file.id">
                    <slot name="fileItem" :file="file">
                        <div class="icon-box">
                            <n-image class="icon img" v-if="isImg(file)" :src="file.url"></n-image>
                            <img v-else class="icon" :src="getIconPath(file)" alt="">
                        </div>
                        <div class="right-box">
                            <div class="file-info">
                                <span>{{ file.name }}</span>
                                <n-icon class="control" :size="40"  >
                                    <pause v-if="file.status == 2" @click="handlePause(file)"></pause>
                                    <play v-if="file.status == 1" @click="handlePlay(file)"></play>
                                    <refresh v-if="file.status == -1" @click="handleRefresh(file)"></refresh>
                                    <close @click="handleDelete(file)"></close>
                                </n-icon>
                            </div>
                            <n-progress type="line" :percentage="getProgress(file)" :color="PREGRESS_COLOR[file.status]"/>
                            <div class="file-status">
                                <span>{{ UPLOAD_STATUS[file.status] }}</span>
                                <span>{{ getFileSize(file) }}</span>
                            </div>
                        </div>
                    </slot>
                </div>
            </n-spin>
        </n-scrollbar>
    </div>
</template>

<script setup>
import { defineProps, defineEmits, computed, ref, nextTick } from 'vue'
import {
    NUpload,
    NUploadDragger,
    NIcon,
    NText,
    NP,
    NUploadTrigger,
    NProgress,
    NButton,
    NImage,
    NScrollbar,
    NSpin
} from "naive-ui";
import { CloudUploadSharp, Pause, Play, Refresh, Close } from "@vicons/ionicons5";
import SparkMD5 from 'spark-md5';
// const icons = import.meta.glob('../assets/images/upload/*.png')

// 图片后缀
const IMG_SUFFIX = ["jpg", "png", "gif", "bmp", "ico", "webp", "svg"]
// 文件类型
const FILE_TYPE = {
    '3D文件类': ['obg'],
    '表格类': ['xlsx','xls','csv'],
    '动画类': ['swf'],
    '批处理': ['bat'],
    '视频': ['FLV ', 'AVI', 'MOV', 'MP4', 'WMV'],
    '数据库': ['dat'],
    '网页类': ['html'],
    '文本类': ['txt'],
    '系统命令': ['com'],
    '系统文件': ['dll'],
    '系统专用文件': ['sys'],
    '样式类': ['css'],
    '音频': ['MP3', 'WMA', 'WAV', 'APE', 'FLAC', 'OGG', 'AAC'],
    '执行文件': ['exe'],
    'AI': ['ai'],
    'C语言类': ['c', 'cpp'],
    'JavaScript类': ['js', 'jsx'],
    'PS': ['ps'],
    'PDF': ['pdf'],
    'word类': ['doc', 'docx'],
    '幻灯片类': ['ppt','pptx'],
    '压缩文件': ['rar','zip','7z'],
}
// 上传状态
const UPLOAD_STATUS = {
    '-1': '上传失败',
    '1': '暂停',
    '2': '上传中',
    '3': '上传完成'
}
// 进度条颜色
const PREGRESS_COLOR = {
    '-1': '#c06666',
    '1': '#cbbb66',
    '2': '#6da6b7',
    '3': '#8cb95a'
}

const props = defineProps({
    onBeforeUpload: Function,
    accept: {
        type: String,
        default: () => ''
    },
    value: {
        type: Array,
        default: () => []
    },
    limitSize: {
        type: Number,
        default: () => 500
    },
    isSection: {
        type: Boolean,
        default: () => false
    },
    directory: {
        type: Boolean,
        default: () => false
    },
    onDelete: Function,
    api: Function,
    apiParamsField: {
        type: Object,
        default: () => ({
            id: 'id',
            file: 'file',
            fileName: 'fileName',
            size: 'size',
            uploadSize: 'uploadSize',
            chunkSize: 'chunkSize'
        })
    }
})
const emit = defineEmits(['update:value'])

const { accept, limitSize, api, apiParamsField, directory } = {...props}

const fileList = computed({
    get(){
        return props.value
    },
    set(value){
        emit('update:value', value)
    }
})

const loading = ref(false)
let isDirectory = ref(directory)

/**
 * 上传文件主方法
 * @param {*} file 
 */
const customRequest = async (file) => {
    // console.log(file)
    console.log(file.file.lastModifiedDate)

        if(!api) {
            $message.error('api都没有,怎么上传')
            return
        }
        if(file.status != 2){
            $message.error('修改状态为2:执行上传')
            return
        }
        
        let uploadSize = file.uploadSize || 0
        const fileSize = file.size
        
        while(uploadSize < fileSize && file.status == 2){
            let end = uploadSize + limitSize
            end = end >= fileSize ? fileSize : end
            const chunkFile = file.file.slice(uploadSize, end)

            const formData = new FormData()
            const params = {
                id: file.md,
                file: chunkFile,
                fileName: file.name,
                size: fileSize,
                uploadSize: uploadSize,
                chunkSize: end - uploadSize,
            }
            // console.log('params:', params)
            Object.keys(apiParamsField).forEach(key => {
                const field = apiParamsField[key]
                formData.append(field, params[key])
            })

            try {
                await api(formData).then(res => {

                    // 上传成功
                    if(res.code == 1000){
                        file.uploadSize = res.data.uploadSize

                        if(res.data.uploadSize >= fileSize){
                            file.status = 3
                            // console.log('res:', res.data)
                        }
                        // console.log('file:', file)
                        uploadSize += limitSize
                    }else{
                        // 上传失败
                        $message.error(res.msg)
                        file.status = -1
                        throw new Error(res.msg)
                    }
                })
            } catch (error) {
                console.error(error)
                file.status = -1
                return
            }

        }
        
}

/**
 * 文件上传前,对文件做校验
 * @param {*} uploadFileInfo 
 */
const handleBeforeUpload = async (uploadFileInfo) => {
    // console.log(uploadFileInfo)
    const fileInfo = uploadFileInfo.file
    const oldFileInfo = uploadFileInfo.oldFile || {}

    // 检测文件类型
    const suffix = fileInfo.name.slice(fileInfo.name.lastIndexOf('.'))
    if(accept != '' && !accept.split(',').some(item => new RegExp(suffix, 'i').test(item))){
        $message.warning(`文件:${fileInfo.name}与上传类型不符`)
        return false
    }

    // 检测文件大小
    const fileSize = fileInfo.file.size / 1024 / 1024
    if(limitSize && fileSize > limitSize) {
        $message.warning(`文件:${fileInfo.name}超出上传大小限制(${limitSize}MB)`)
        return false
    }

    // 队列判断
    const md = fileInfo.md ? fileInfo.md : await getFileMd5(fileInfo.file)
    const file = fileList.value.find(item => item.md == md)
    if(file && !fileInfo.continue){
        $message.warning(`文件:${fileInfo.name}已在上传列表,请勿重复上传`)
        return false
    }

    // 续传文件判断
    if(fileInfo.continue && md != oldFileInfo.md){
        $message.warning(`文件:${fileInfo.name}与上传文件不一致,请上传原文件`)
        return false
    }

    // 回调校验
    const callback = props.onBeforeUpload
    let flag = callback && callback(uploadFileInfo)
    if(flag === undefined || flag == true) flag = true
    else flag = false

    if(flag){
        fileInfo.md = md
        fileInfo.url = await getImgUrl(fileInfo)
        fileInfo.status = 2
        fileInfo.size = fileInfo.file.size
        if(!fileInfo.continue){
            fileList.value.push(fileInfo)
        }else{
            const file = fileList.value.find(item => item.md == fileInfo.md)
            file.status = 2
            file.file = fileInfo.file
        }

        if(props.isSection){
            customRequest(fileList.value.find(item => item.md == fileInfo.md))
        }
    }
    return flag
}

/**
 * 是否是图片
 * @param {*} param0 
 */
const isImg = ({name}) => {
    return IMG_SUFFIX.some(item => new RegExp(`.${item}`,'i').test(name))
}

/**
 * 获取图片路径
 * @param {*} param0 
 */
const getImgUrl = async ({file, url, name}) => {
    if(!isImg({name})) return url
    if(url) return url
    let result = ''
    const fr = new FileReader()
    fr.readAsDataURL(file)
    await new Promise((resolve, reject) => {
        fr.addEventListener('load', () => {
            if(fr.result){
                resolve(fr.result)
            }else{
                reject()
            }
        })
    }).then(res => {
        result = res
    })
    return result
}


/**
 * 获取文件md5
 * @param {*} file 
 */
const getFileMd5 = async (file) => {
    let fr = new FileReader(),
        blobSlice =
            File.prototype.mozSlice ||
            File.prototype.webkitSlice ||
            File.prototype.slice,
        chunkSize = 1024 * 1024 * 2,
        // read in chunks of 2MB
        currentChunk = 0,
        spark = new SparkMD5();
    // const fileSize = file.size / 1024 / 1024
    // const chunkSize = parseInt(file.size / 500) * 10
    const chunks = Math.ceil( file.size / chunkSize)
    let result = ''

    let count = 0
    loadNext();

    loading.value = true
    await new Promise((resolve, reject) => {
        fr.addEventListener('load', () => {
            try {
                spark.appendBinary(fr.result);
                // append binary string
                currentChunk++;
                if (currentChunk < chunks) {
                    loadNext();
                } else {
                    let md = spark.end();
                    resolve(md)
                }
                // console.log(++count, chunks)
            } catch (error) {
                reject()
            }
        })
    }).then(res => result = res).finally(() => {
        loading.value = false
    })


    function loadNext () {
        let start = currentChunk * chunkSize,
            end = start + chunkSize >= file.size ? file.size : start + chunkSize;
        fr.readAsBinaryString(blobSlice.call(file, start, end));
    }

    return result
}
    
const getIconPath = ({name}) => {
    let result = ''
    Object.keys(FILE_TYPE).forEach(key => {
        const type = FILE_TYPE[key]
        type.forEach(suffix => {
            if(new RegExp(`.${suffix}$`, 'i').test(name)){
                result = key
            }
        })
    })
    result = result || '未知类'

    return new URL(`../assets/images/upload/${result}.png`, import.meta.url).href
}

/**
 * 获取进度条
 * @param {*} fileInfo 
 */
const getProgress = (fileInfo) => {
    let {uploadSize = 0, size} = fileInfo
    return (uploadSize / size * 100).toFixed(1)
}

/**
 * 获取文件上传大小
 * @param {*} fileInfo 
 */
const getFileSize = (fileInfo) => {
    let {uploadSize = 0, size} = fileInfo
    uploadSize = uploadSize / 1024 / 1024
    size = size / 1024 / 1024
    if(size < 1){
        return `${(uploadSize * 1024).toFixed(2)}KB / ${(size * 1024).toFixed(2)}KB`
    }else{
        return `${uploadSize.toFixed(2)}MB / ${size.toFixed(2)}MB`
    }
}

/**
 * 暂停
 */
const handlePause = (fileInfo) => {
    fileInfo.status = 1
}

/**
 * 续传
 * @param {*} fileInfo 
 */
const handlePlay = (fileInfo) => {
    if(fileInfo.file){
        handleBeforeUpload({
            file:{
                ...fileInfo,
                continue: true
            },
            oldFile:{
                ...fileInfo
            }
        })
    }else{
        selectFile((file) => {
            handleBeforeUpload({
                file:{
                    file,
                    name: file.name,
                    continue: true
                },
                oldFile:{
                    ...fileInfo
                }
            })
        }, accept)
    }
}

/**
 * 删除
 * @param {*} fileInfo 
 */
const handleDelete = (fileInfo) => {
    const onDelete = props.onDelete
    onDelete && onDelete(fileInfo)
}

/**
 * 重传
 * @param {*} fileInfo 
 */
const handleRefresh = (fileInfo) => {
    const Refresh = props.Refresh
    Refresh && Refresh(fileInfo)
}

/**
 * 上传文件夹按钮点击
 * @param {*} fn 
 */
const onDirBtnClick = (fn) => {
    isDirectory.value = true
    nextTick(() => {
        fn()
        isDirectory.value = directory
    })
}

/**
 * 选择文件
 * @param {*} callBack 
 * @param {*} accept 
 * @param {*} multiple 
 */
const selectFile = (callBack, accept = '*', multiple = false) => {
    document.getElementById('#ay-select-input')?.remove()

    let elInput = document.createElement('input')
    elInput.setAttribute('id','ay-select-input')
    elInput.setAttribute('accept', accept)
    elInput.setAttribute('type', 'file')
    elInput.setAttribute('style', 'display: none')
    if(multiple)elInput.setAttribute('multiple', multiple)
    elInput.addEventListener('change', e => {
        if(e.target.files.length > 0){
            if(multiple){
                callBack && callBack(e.target.files)
            }else{
                callBack && callBack(e.target.files[0])
            }
        }
    })
    document.body.appendChild(elInput)
    elInput.click()
}
</script>


<style scoped lang="less">
.upload-btn {
    margin-top: 12px;
}

.flex-sb{
    display: flex;
    justify-content: space-between;
}

.upload-container{
    display: flex;
    padding: 20px;
    .n-upload{
        width: 200px;
    }
    
    .file-list-box{
        .file-item{
            .flex-sb();
    
            // icon
            .icon-box{
                display: flex;
                align-items: center;
                justify-content: center;
                box-sizing: border-box;
                width: 65px;
                padding: 10px;
                .icon{
                    width: 100%;
                    object-fit: cover;
                }
                :deep(.n-image){
                    img{
                        width: 100%;
                        object-fit: cover;
                    }
                }
            }
    
            // file-info
            .right-box{
                flex: 1;
                display: flex;
                flex-direction: column;
                justify-content: center;
                margin-left: 10px;
                .file-info{
                    .flex-sb();
                    .control{
                        display: flex;
                        font-size: auto;
                        height: auto;
                        justify-content: end;
                        svg{
                            font-size: 19px;
                            height: auto;
                            cursor: pointer;
                        }
                    }
                }
                .file-status{
                    .flex-sb();
                }
    
            }
        }
    }

    :deep(.n-scrollbar){
        padding-right: 20px;
    }
}

:deep(.n-progress.n-progress--line .n-progress-icon.n-progress-icon--as-text){
    width: 50px;
}
</style>