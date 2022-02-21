const mongoose = require('mongoose');

// 트랙 데이터

const lineStringSchema = new mongoose.Schema({
   type: {
       type: String,
       enum: ['LineString'],
       default: 'LineString',
   },
   coordinates: {
       type: [[Number]], // 좌표
       required: true,
   },
});

const { Schema } = mongoose;
const trackSchema = new Schema({
    name: { // 트랙이름
        type: String,
        required: true,
    },
    distance: { // 트랙의 총 거리
        type: Number, // float
        required : true,
    },
    userId: { // 누가 생성했는가    
        type: Number,
        required: true,
    },
    description: { // 트랙설명
        type: String,
        required: true,
    },
    event: { // 트랙종목
        type: String,
        required: true,
    },
    checkPoint: { // 체크포인트
        type: [Array],
        required: true,
    },
    gps: { // 트랙 좌표
        type: lineStringSchema,
        required: true,
        index: '2dsphere',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    altitude: { // 고도
        type: Array,
        required: true,
    },
    start_latlng: {
        type: ['Point'],
        required: true
    },
    end_latlng: {
        type: ['Point'],
        required: true, 
    }
});

module.exports = mongoose.model('Track', trackSchema);