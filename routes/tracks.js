const express = require("express");
const Track = require("../schemas/track");
const { validationResult } = require("express-validator");

const router = express.Router();

/**
 * @swagger
 * tags:
 *  - name: tracks
 *    description: 트랙에 관련한 API
 */

/**
 * @swagger
 * /api/track/{trackId}:
 *    get:
 *      summary: Return 특정한 트랙을 리턴함.
 *      description: 특정한 트랙을 리턴함.
 *      tags:
 *        - tracks
 *      parameters:
 *        - in: path
 *          name: trackId
 *          required: true
 *          example: 621390d75463764b87a94f1d
 *      responses:
 *        '200':
 *          description: OK
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/Track'
 */

router.get("track/:trackId", async (req, res, next) => {
  try {
    const track = await Track.findById(req.params.trackId);
    if (track) {
      console.log("GET track...", track);
      res.status(200).json(track);
    } else {
      res.status(200).json({ message: "track이 존재하지 않습니다." });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * @swagger
 * /api/track:
 *   post:
 *     summary: Add 트랙을 저장하고 ID 를 리턴함
 *     description: 새로운 트랙 생성
 *     tags:
 *       - tracks
 *     requestBody:
 *       requried: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Track'
 *     responses:
 *       '201':
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/responses/Track'
 *       '200':
 *         description: track exist
 */

router.post("/track", async (req, res, next) => {
  // TODO: 트랙 생성하면서 자신의 gpsdata를 이용해 트랙기록 저장

  if (!validationResult(req).isEmpty()) {
    return res.status(422).json("잘못된 입력값입니다.");
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
          type: "LineString",
          coordinates: storeGPSdate,
        },
      },
    },
  }).find(async (error, results) => {
    console.log(results, "intersect results...");
    if (error) {
      console.error(error);
    }
    if (results.length == 0) {
      try {
        const track = await createTrack(req.body, storeGPSdate);
        console.log(track);
        return res
          .status(201)
          .json({ message: "POST create track complete..." });
      } catch (err) {
        console.error(err);
        next(err);
      }
    }

    // 길이 계산
    for (let i = 0; i < results.length; i++) {
      if (
        -100 <= results[i].distance - storeDistance &&
        results[i].distance - storeDistance <= 100
      ) {
        // 거리가 비슷
        // * 100 Math.floor(Num)
        if (
          Math.floor(results[i].start_latlng[0] * 100) / 100 ==
            Math.floor(storeStartGPS[0] * 100) / 100 && // 출발지, 목적지 좌표 비교
          Math.floor(results[i].start_latlng[1] * 100) / 100 ==
            Math.floor(storeStartGPS[1] * 100) / 100 &&
          Math.floor(results[i].end_latlng[0] * 100) / 100 ==
            Math.floor(storeEndGPS[0] * 100) / 100 &&
          Math.floor(results[i].end_latlng[1] * 100) / 100 ==
            Math.floor(storeEndGPS[1] * 100) / 100
        ) {
          return res.status(200).json({ message: "track exist..." });
        }
      }
    }

    try {
      const track = await createTrack(req.body, storeGPSdate);
      console.log(track);
      return res.status(201).json({ message: "POST create track complete..." });
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
  };
});

/**
 * @swagger
 * /api/track/search:
 *   get:
 *     summary: Return 구간에 맞는 트랙을 리턴함
 *     description: 구간에 맞게 특정 범위 안에 있는 트랙 중 길이가 긴 순으로 10개 까지 리턴
 *     tags:
 *       - tracks
 *     parameters:
 *       - name: bounds
 *         in: query
 *         required: true
 *         description: query string
 *         example: ?bounds=128.22&bounds=33.33&bounds=128.33&bounds=33.33
 *       - name: zoom
 *         in : query
 *         required: true
 *         description: query string
 *         example: ?zoom=16
 *       - name: event
 *         in : query
 *         required: true
 *         description: query string
 *         example: ?event=R or event=B
 *     responses:
 *       '200':
 *         description: 구간 리턴
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Track'
 */

// 여러경로 가져오기 (반경계산)
router.get("track/search", async (req, res, next) => {
  const bounds = req.query.bounds;
  const zoom = req.query.zoom;
  const event = req.query.event;

  console.log(JSON.stringify(bounds));
  const tracks = Track.find({
    "gps.coordinates": {
      $geoWithin: {
        // 왼쪽 밑, 오른쪽 위 좌표 사이의 저장된 문서를 가져옴
        $box: [
          [parseFloat(bounds[0]), parseFloat(bounds[1])],
          [parseFloat(bounds[2]), parseFloat(bounds[3])],
        ],
      },
    },
  });
  tracks
    .where({ event: event })
    .sort({ distance: -1 })
    .limit(10)
    .exec((error, result) => {
      // 길이를 기준으로 내림차순이며, 10개로 개수를 제한함.
      if (error) {
        console.log(error);
        next(error);
      }
      if (result.length == 0) {
        return res.status(200).json({
          result: result,
          message: "해당 구간에 존재하는 트랙이 없습니다.",
          zoom: zoom,
        });
      }
      res.status(200).json({ result: result, message: "ok", zoom: zoom });
    });
});

module.exports = router;
