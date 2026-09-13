import { customAlphabet } from 'nanoid'

// 8 碼，排除 0/O、1/I/L。比刮刮卡的 6 碼長，因為餐券可累積、存活期長。
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
export const createVoucherCode = customAlphabet(ALPHABET, 8)
