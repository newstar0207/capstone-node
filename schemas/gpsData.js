const mongoose = require("mongoose");

// 트랙을 만들기 전 개인 sns에 나오는 경로 데이터 컬렉션

const { Schema } = mongoose;
const {
  Types: { ObjectId },
} = Schema;

const lineStringSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["LineString"],
    default: "LineString",
  },
  coordinates: {
    type: [[Number]],
    required: true,
  },
});

// const userSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   userId: { type: Number, required: true },
// });

const gpsDataSchema = new Schema({
  // 위도, 경도, 속도, 시간, 거리, 트랙아이디
  trackId: {
    type: ObjectId,
    ref: "Track",
    default: null,
  },
  gps: {
    // 트랙 좌표
    type: lineStringSchema,
    required: true,
  },
  user: {
    name: { type: String, required: true },
    userId: { type: Number, required: true },
  },
  speed: {
    type: [Number],
    required: true,
  },
  time: {
    type: [Number],
    required: true,
  },
  distance: {
    type: [Number],
    required: true,
  },
  event: {
    // 트랙종목
    type: String,
    required: true,
  },
  altitude: {
    // 고도
    type: Array,
    required: true,
  },
  slope: {
    // 경사도
    type: Array,
    required: true,
  },
  avgSlope: {
    type: Number,
    required: true,
  },
  totalTime: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("GpsData", gpsDataSchema);
