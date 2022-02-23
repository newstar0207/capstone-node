const express = require('express');
const Track = require('../schemas/track');
const { validationResult } = require('express-validator');

const router = express.Router();

/**
 * @swagger
 * tags:
 *  - name: tracks
 *    description: 트랙에 관련한 API
 */

/**
 * @swagger
 * /api/{id}/track:
 *    get:
 *      summary: Return Track.
 *      description: 특정한 트랙을 리턴함.
 *      tags:
 *        - tracks
 *      parameters:
 *        - in: path
 *          name: trackId
 *          required: true
 *      responses:
 *        '200':
 *          description: OK
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Track'
 */

router.get('/:trackId/track', async (req, res, next) => {

  try {
    const track = await Track.findById(req.params.trackId);
    if (track) {
      console.log('GET track...', track);
      res.status(200).json(track);
    } else {
      res.status(200).json({ message : 'track이 존재하지 않습니다.'});
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }  
});

/**
 * @swagger
 * /api/track:
 *    post:
 *      summary: Add Track 
 *      description: 새로운 트랙 생성 
 *      tags: 
 *        - tracks
 *      requestBody:
 *        requried: true
 *        content:
 *          application/x-www-form-urlencoded:
 *            schema:
 *              $ref: '#/components/schemas/Track'
 *      responses:
 *        '201':
 *          description: OK
 *        '200':
 *          description: track exist  
 */ 


// 트랙 생성하기
router.post('/track', async (req, res, next) => {

  // TODO: 트랙 생성하면서 자신의 gpsdata를 이용해 트랙기록 저장

  if(!validationResult(req).isEmpty()) {
    return res.status(422).json('잘못된 입력값입니다.');
  }

  console.log(JSON.parse(req.body.gps));

  const storeGPSdate = JSON.parse(req.body.gps);
  const storeDistance = req.body.distance;
  const storeStartGPS = storeGPSdate[0];
  const storeEndGPS = storeGPSdate[storeGPSdate.length - 1];

  // 출발지점. 끝지점이 같은 경우 길이를 다르게 해야만 저장 가능
  Track.find({ 
    gps: {
      $geoIntersects: {
        $geometry: {
          type: 'LineString',
          coordinates: storeGPSdate,
        }
      }
    }
  }).find( async (error, results) => {
    console.log(results, 'intersect results...');
    if (error) {
      console.error(error);    
    }
    if (results.length == 0) {
      try {
        const track = await createTrack(req.body, storeGPSdate); 
        console.log(track);
        return res.status(201).json({ message: 'POST create track complete...'}); 
      } catch (err) {
        console.error(err);
        next(err);
      }
    }

    // 길이 계산
    for (let i = 0; i < results.length; i++) {
      if (-100 <= (results[i].distance - storeDistance) && (results[i].distance - storeDistance) <= 100) { // 거리가 비슷
        // * 100 Math.floor(Num)
        if (Math.floor(results[i].start_latlng[0] * 100) / 100 == Math.floor(storeStartGPS[0] * 100) / 100 && // 출발지, 목적지 좌표 비교
          Math.floor(results[i].start_latlng[1] * 100) / 100 == Math.floor(storeStartGPS[1] * 100) / 100 &&
          Math.floor(results[i].end_latlng[0] * 100) / 100 == Math.floor(storeEndGPS[0] * 100) / 100 &&
          Math.floor(results[i].end_latlng[1] * 100) / 100 == Math.floor(storeEndGPS[1] * 100) / 100) {
        
          return res.status(200).json({ message: 'track exist...'})
        }   
      }
    }

    try {
      const track = await createTrack(req.body, storeGPSdate); 
      console.log(track);
      return res.status(201).json({ message: 'POST create track complete...'}); 
    } catch (err) {
      console.error(err);
      next(err);
    }
  });

  // console.log(tracks);
  const createTrack = async (trackInfo, storeGPSdate) => {
    return await Track.create({
      name: trackInfo.name, // 트랙 이름
      distance: parseFloat(trackInfo.distance), // 트랙 전체 거리
      userId: parseInt(trackInfo.userId), // 트랙 저장한 유저 아이디
      description: trackInfo.description, // 트랙 설명
      event: trackInfo.event, // 종목
      gps: { coordinates: JSON.parse(trackInfo.gps) }, // gps 좌표
      altitude: JSON.parse(trackInfo.altitude), // 고도
      checkPoint: JSON.parse(trackInfo.checkPoint), // TODO: 체크포인트
      start_latlng: storeGPSdate[0],
      end_latlng: storeGPSdate[storeGPSdate.length - 1],
    });  
  }
});
  

// 여러경로 가져오기 (반경계산)
router.get('/search', async (req, res, next) => {
  // TODO: 로그인

  let zoom = req.body.query;
  if (zoom == 0) zoom = 1;

  await Track.find({
    gps: {
      $near: { // Returns geospatial objects in proximity to a point
        $maxDistance: 1000 / zoom, // 미터
        $geometry: { // 검색 기준 좌표
          type: "Point",
          coordinates: [parseFloat(req.query.lng), parseFloat(req.query.lat) ]
        }
      }
    }
  }).find((error, results) => {
    if (error) console.log(error);
    console.log(JSON.stringify(results, 0, 2));
    res.status(200).json(JSON.stringify(results, 0, 2));
  });  
});

module.exports = router;

// 1. 1. 경로 저장 → 단순한 저장
// 2. 경로 가져오기 → 그냥 내가 달리기 위해 가져옴
// 3. 여러 경로 가져오기 (위치기반)

