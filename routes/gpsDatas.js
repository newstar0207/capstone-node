const express = require('express');
const GPSdata = require('../schemas/gpsData');

const router = express.Router();

// gps기록 저장.
router.post('/gpsdata', async (req, res, next) => {

    // TODO: validation 넣기 
    // TODO: 기록이 자전거나, 달리기로 나올 수 있는 기록인가?
    try{
        const gpsData = await GPSdata.create({
            trackId: req.body.trackId,
            userId: req.body.userId,
            gps: { coordinates: JSON.parse(req.body.gps) }, // gps 좌표
            speed: JSON.parse(req.body.speed),
            time: JSON.parse(req.body.time),
            totalTime: req.body.totalTime,
            distance: JSON.parse(req.body.distance),
            event: req.body.event,
            altitude: JSON.parse(req.body.altitude),
        });
        console.log(gpsData);
        res.status(201).json({message: 'gpsData를 저장합니다.'});
    } catch (err) {
        console.error(err);
        next(err);
    }
});

// SNS: 자신의 gps기록만 보기, 자신의 gps기록 가져오기.
router.get('/:userId/gpsdata', async (req, res, next) => {

    // TODO: 필요한 정보만 가져오기

    try {
        const GPSdatas = GPSdata.find({userId: req.params.userId}).sort({createdAt: 'asc'})
        GPSdatas.exec((err, result) =>{
            if (err) {
                console.error(err);
                next(err);
            } else {
                if (result.length == 0) {
                    res.status(200).json({message: 'gpsData가 존재하지 않습니다.'})
                } 
                res.status(200).json(result);
            }
        })  
       
    } catch (err) {
        console.error(err);
        next(err);
    }
})

// SNS: 자신이 팔로우한 사람, 자신의 gps데이터 (전체)
router.get('/gpsdata', async (req, res, next) => {
    try { // sort createdAt
        // TODO: 팔로우 한 사람의 경로만 가져오는거 효율적으로 짜는 법 생각하기.
        const follow = req.body.follow; // follow 한 userId 가져옴

    } catch (err) {
        console.log(err);
        next(err);
    }
})

// 전체 트랙별 랭킹 (시간 순)
router.get('/:trackId/score', async (req, res, next) => {
    try {
        const GPSdatas = GPSdata.find({trackId: req.params.trackId}).sort({totalTime: 'asc'})
        GPSdatas.exec((err, result) =>{
            if (err) {
                console.error(err);
                next(err);
            } else {
                if (result.length == 0) {
                    res.status(200).json({message: 'gpsData가 존재하지 않습니다.'})
                } 
                res.status(200).json(result);
            }
        }) 
    } catch (err) {
        console.log(err);
        next(err);
    }
})

// 팔로우 한 사람만 나오는 트랙별 랭킹 (시간 순)

// 트랙 별 랭킹에서 페이스 메이커를 골랐을 경우의 gpsdata 리턴
router.get('/:gpsdataId/pacemaker', async (req, res ,next) => {
    try {
        const paceMaker = GPSdata.findById(req.params.gpsdataId);
        paceMaker.exec((err, result) => {
            if (err) {
                console.error(err);
                next(err);
            } else {
                if (result.length == 0) {
                    res.status(200).json({message: 'gpsData가 존재하지 않습니다.'})
                }
                res.status(200).json(result);
            }
        })
    } catch (err) {
        console.error(err);
        next(err);
    }
})

// gpsdata 삭제
router.delete('/:gpsdataId', async (req, res, next) => {
    try { 
        await GPSdata.deleteOne({ id: req.params.gpsdataId});
        res.status(200).json({message: 'gpsData를 삭제하였습니다'});
    } catch (err) {
        console.error(err);
        next(err);
    }
})

module.exports = router;

