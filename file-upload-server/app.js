const express = require('express')
const uploader = require('express-fileupload')
const { resolve, extname } = require('path')
const { existsSync, appendFileSync, writeFileSync, statSync, readdirSync, unlinkSync} = require('fs')

const MSG_CODE = {
    '1002': '文件丢失',
    '1001': '上传大小超出文件大小',
    '1000': '成功'
}

let fileList = new Map()

const getFileInfo = (fileInfo, filePath) => {
    const {
        id,
        fileName,
        size,
    } = fileInfo
    // console.log('getFileInfo', id,fileName,size)
    const stats = statSync(filePath)
    const file = fileList.get(id)
    if(!file){
        fileList.set(id, {
            id,
            md: id,
            uploadSize: stats.size,
            name: fileName,
            url: `/${id}${extname(fileName)}`,
            size,
        })
    }else{
        file.uploadSize = stats.size
    }
    console.log('getFileInfo', id, file, fileList)
    return fileList.get(id)
}

const app = express()

app.use(express.urlencoded({extended: true}))
app.use(express.json())
app.use(express.static('./upload_temp'))
app.use(uploader())

const root = 8000

app.all('*', (req, res, next) => {
    console.log(req)
    res.header('Access-Control-Allow-origin' , '*');
    res.header('Access-Control-Allow-Methods','POST,GET');
    next()
})

app.post('/upload', (req, res, next) => {
    console.log(req)
    const {
        id,
        fileName,
        size,
        uploadSize,
        chunkSize,
    } = req.body
    const { file } = req.files
    // console.log(id, fileName, size)

    const filePath = resolve(__dirname, `./upload_temp/${id}${extname(fileName)}`)

    // 如果文件不存在
    if(!existsSync(filePath)){
        if(uploadSize > 0){     // 有上传记录没有文件,文件丢失
            res.send({
                code: '1002',
                msg: MSG_CODE['1002'],
            })
            return
        }

        // 没有上传记录，写入文件
        writeFileSync(filePath, file.data)
        const stats = statSync(filePath)
        res.send({
            code: '1000',
            msg: MSG_CODE['1000'],
            data: getFileInfo(req.body, filePath)
        })
        return 
    }else{  // 文件已经存在
        const stats = statSync(filePath)
        if(Number(stats.size) + Number(chunkSize) > Number(size)){
            // 上传大小超出文件大小
            res.send({
                code: '1001',
                msg: MSG_CODE['1001'],
                data: getFileInfo(req.body, filePath)
            })
            return
        }else if(stats.size == size){
            res.send({
                code: '1000',
                msg: MSG_CODE['1000'],
                data: getFileInfo(req.body, filePath)
            })
        }else{
            // 将文件数据追加到当前文件中
            appendFileSync(filePath, file.data)
            const stats = statSync(filePath)
            res.send({
                code: '1000',
                msg: MSG_CODE['1000'],
                data: getFileInfo(req.body, filePath)
            })
        }
    }
    
    return
})

app.post('/getFileList', (req, res) => {
    // const result = Object.keys(fileList).map(key => fileList[key])
    const result = []
    const it = fileList.values()
    let value = it.next()
    while(!value.done){
        const item = value.value
        item.status = item.uploadSize == item.size ? 3 : 1
        result.push(item)
        value = it.next()
    }

    console.log('getFileList', result)
    res.send({
        code: '1000',
        msg: MSG_CODE['1000'],
        data: result
    })
    return
})

app.get('/resetFileList', (req, res) => {
    fileList.clear()
    removeFileDir(resolve(__dirname, `./upload_temp`))
    res.send({
        code: '1000',
        msg: MSG_CODE['1000'],
        data:{
            fileNum: 0
        }
    })
})

app.listen(root, () => {
    console.log('server is runing on ' + root)
})


const removeFileDir = (path)=>{
    var files = readdirSync(path);
    for (let item of files) {
        var stats = statSync(`${path}/${item}`);
        if (stats.isDirectory()) {
            removeFileDir(`${path}/${item}`)
        } else {
            unlinkSync(`${path}/${item}`)
        }
    }
    // fs.rmdirSync(path)
}