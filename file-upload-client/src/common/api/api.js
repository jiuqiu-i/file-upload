import axios from "axios"
const axiosInstance = axios.create({
    baseURL: 'http://172.18.230.160:8000'
})

const MSG_CODE = {
    '1002': '文件丢失',
    '1000': '成功'
}

export const uploadApi = (params) => axiosInstance.post('/upload', params)
export const apiGetFileList = (params) => axiosInstance.post('/getFileList', params)

axiosInstance.interceptors.response.use((res) => {
    return res.data
})