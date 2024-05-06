<template>
        <!-- :accept="accept" -->
    <file-upload 
        style="width: 750px;"
        multiple 
        directory-dnd
        action 
        :max="5" 
        v-model:value="fileList"
        :isSection="true"
        :limitSize="1024 * 10"
        :show-file-list="false"></file-upload>
        <!-- :api="uploadApi" -->
        <!-- :limit-size="50" -->
</template>

<script setup>
    import { reactive, ref } from "vue";
    import fileUpload from "./components/file-upload.vue";
    import { useMessage } from 'naive-ui'
    import { uploadApi, apiGetFileList } from '../src/common/api/api.js'

    window['$message'] = useMessage()

    let fileList = reactive([])
    const baseURL = 'http://172.18.230.160:8000'



    const accept = 'image/png, image/jpeg, .jpg, .pdf, .mp4'
    apiGetFileList().then(res => {
        fileList.splice(0,0,...res.data)
        fileList.forEach(item => {
            item.url = `${baseURL}${item.url}`
        })
        console.log(fileList)
    })


</script>

<style>
#app {
    font-family: Avenir, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: center;
    color: #2c3e50;
    margin-top: 60px;
}
</style>
