const express = require("express");
const { body, validationResult, query, param } = require("express-validator");
const Track = require("../schemas/track");
const ObjectId = require("mongoose").Types.ObjectId;
const TrackInfo = require("../models/TrackInfo");
const EventType = require("../types/EventType");


const router = express.Router();

/**
 * @swagger
 * tags:
 *  - name: tracks
 *    description: 트랙에 관련한 API
 */

const calculateSlope = ({ gps, altitude }) => {
  /*
    1. 트랙에서 평균 거리만 구하고 싶음
    2. gps 좌표사이사이의 거리를 sum으로 계산하여 더해가야함.
    3. avgslope에 저장함
  */
  const slopes = gps.map((item, i) => {
    if (!i) return 0;
    const Radius = 6371e3; // metres

    // 좌표를 라디안 단위로 변환
    const φ1 = (gps[i - 1][1] * Math.PI) / 180; // φ(위도), λ(경도) in radians/ Δ(델타)
    const φ2 = (item[1] * Math.PI) / 180;
    const Δφ = ((item[1] - gps[i - 1][1]) * Math.PI) / 180;
    const Δλ = ((item[0] - gps[i - 1][0]) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    let d = Radius * c; // in metres
    let slope = 0;
    d = d < 1 ? (slope = 0) : (slope = ((altitude[i] - altitude[i - 1]) / d) * 100);

    return slope;
  });
  return (
    Math.floor((slopes.reduce((sum, item) => sum + item, 0) / slopes.length) * 10) /
    10
  );
};

const calCheckPoints = ({ gps, totalDistance, event }) => {
  /*
    - 자전거 1 ~ 20km : 3개, 21 ~ 60 : 5개, ~~~ : 10개
    - 달리기 1 ~ 3km : 3개, 4 ~ 10 : 5개, ~~~: 10개
   */
  let checkPoints = [];
  if (event === EventType.BIKE) {
    if (totalDistance <= 20) {
      for (let i = 1; i <= 3; i++) {
        checkPoints.push(Math.floor(gps.length / 4) * i);
      }
    } else if (totalDistance <= 60) {
      for (let i = 1; i <= 5; i++) {
        checkPoints.push(Math.floor(gps.length / 6) * i);
      }
    } else {
      for (let i = 1; i <= 10; i++) {
        checkPoints.push(Math.floor(gps.length / 11) * i);
      }
    }
  } else {
    if (totalDistance <= 3) {
      for (let i = 1; i <= 3; i++) {
        checkPoints.push(Math.floor(gps.length / 4) * i);
      }
    } else if (totalDistance <= 10) {
      for (let i = 1; i <= 5; i++) {
        checkPoints.push(Math.floor(gps.length / 6) * i);
      }
    } else {
      for (let i = 1; i <= 10; i++) {
        checkPoints.push(Math.floor(gps.length / 11) * i);
      }
    }
  }
  console.log(checkPoints);
  return checkPoints;
};

/**
 * @swagger
 * /api/tracks:
 *  post:
 *    summary: Add 트랙을 저장하고 ID 를 리턴함
 *    description: 새로운 트랙 생성
 *    tags:
 *      - tracks
 *    requestBody:
 *      requried: true
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/schemas/Track'
 *    responses:
 *      '201':
 *        description: OK
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/responses/postTrack201'
 *      '200':
 *        description: 존재하는 track
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/responses/postTrack200'
 *      '400':
 *        description: request validation error
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/responses/postTrack400'
 *
 */

router.post(
  "/",
  body("gps")
    .exists()
    .isArray()
    .withMessage({ message: "gps 데이터 형식이 잘못되었습니다." }),
  body("totalDistance").custom((value) => {
    // 총 거리를 이용해 validation
    if (value < 0.1 || typeof value !== "number") {
      return Promise.reject("100m 이상으로 트랙을 생성해 주세요.");
    }
    return true;
  }),
  async (req, res, next) => {
    // validation 의 error 가 있을 경우
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const avgSlope = calculateSlope(req.body);
    const checkPoints = req.body.totalDistance > 1 ? calCheckPoints(req.body) : [];

    const storeTrack = new TrackInfo(req.body, avgSlope, checkPoints);

    // return res.json(storeTrack);

    const trackDuplicateCheck = Track.aggregate([
      {
        $match: {
          $and: [
            { event: storeTrack.event }, // 이벤트 체크
            {
              // 출발지 좌표 체크
              start_latlng: {
                $geoWithin: {
                  $centerSphere: [storeTrack.start_latlng.coordinates, 0.1 / 6378.1], // 100m
                },
              },
            },
            {
              // 도착지 좌표 체크
              end_latlng: {
                $geoWithin: {
                  $centerSphere: [storeTrack.end_latlng.coordinates, 0.1 / 6378.1], // 100m
                },
              },
            },
            {
              // 총 거리 비교 distance - 0.1 < totalDistance < distance + 0.1
              $and: [
                {
                  totalDistance: { $gt: storeTrack.totalDistance - 0.1 },
                },
                {
                  totalDistance: { $lt: storeTrack.totalDistance + 0.1 },
                },
              ],
            },
          ],
        },
      },
      {
        // 특정 필드 값만 리턴
        $project: {
          _id: 0,
          trackName: 1,
          totalDistance: 1,
          event: 1,
          "start_latlng.coordinates": 1,
          "end_latlng.coordinates": 1,
        },
      },
    ]).exec();

    trackDuplicateCheck
      .then((result) => {
        console.log(result, "track duplicate check result...");
        if (!result.length) {
          return createTrack(storeTrack);
        } else {
          return res.status(200).json({ message: "이미 존재하는 트랙입니다." });
        }
      })
      .catch((err) => {
        console.error(err);
        next(err);
      });

    // 트랙 생성
    const createTrack = async (storeTrack) => {
      try {
        const track = await Track.create(storeTrack);
        // created
        return res.status(201).json({ trackId: track.id });
      } catch (err) {
        // database error
        console.log(err);
        next(err);
      }
    };
  }
);

/**
 * @swagger
 * /api/tracks/search:
 *  get:
 *    summary: Return 구간에 맞는 트랙을 리턴함
 *    description: 구간에 맞게 특정 범위 안에 있는 트랙 중 길이가 긴 순으로 10개 까지 리턴
 *    tags:
 *      - tracks
 *    parameters:
 *      - name: bounds
 *        in: query
 *        required: true
 *        description: query string
 *        example: ?bounds=128.59376907348633&bounds=35.87806262146614&bounds=128.63033294677734&bounds=35.89941027276767
 *      - name: zoom
 *        in : query
 *        description: query string
 *        example: ?zoom=16
 *      - name: event
 *        in : query
 *        required: true
 *        description: query string
 *        example: ?event=R or event=B
 *    responses:
 *      '200':
 *        description: 구간 리턴
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/responses/getTrackSearch200'
 *      '400':
 *        description: query string error
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/responses/getTrackSearch400'
 *      '404':
 *        description: 존재하는 트랙 없음
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/responses/getTrackSearch404'
 */

// 여러경로 가져오기 (반경계산)
router.get(
  "/search",
  query("bounds")
    .exists()
    .isNumeric()
    .withMessage({ messsage: "bounds가 존재하지 않습니다." }),
  query("event")
    .exists()
    .isIn(["R", "B"])
    .withMessage({ messsage: "event가 틀린 데이터 형식입니다." }),
  async (req, res, next) => {
    // querystrings validat or
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // TODO: 필요한 것 만 따로 얻어서 aggregate 로 바꾸기
    const bounds = req.query.bounds; // 왼쪽 밑, 오른쪽 위 좌표
    const event = req.query.event; // 현재 이벤트

    const tracks = Track.find({
      "gps.coordinates": {
        $geoWithin: {
          $box: [
            [parseFloat(bounds[0]), parseFloat(bounds[1])],
            [parseFloat(bounds[2]), parseFloat(bounds[3])],
          ],
        },
      },
    });
    tracks
      .where({ event: event })
      .sort({ totalDistance: -1 })
      .exec((error, result) => {
        // TODO: select 해서 필요한 거만 받기
        if (error) {
          console.log(error);
          next(error);
        }
        if (!result) {
          return res.status(404).json({
            result: result,
            message: "해당 구간에 존재하는 트랙이 없습니다.",
          });
        }
        return res.status(200).json({ result: result, message: "OK" });
      });
  }
);

/**
 * @swagger
 * /api/tracks/{trackId}:
 *    get:
 *      summary: Return 특정한 트랙을 리턴함.
 *      description: 특정한 트랙을 리턴함.
 *      tags:
 *        - tracks
 *      parameters:
 *        - in: path
 *          name: trackId
 *          required: true
 *          example: 622561232d6ee07c40f75bda
 *      responses:
 *        '200':
 *          description: OK
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/responses/getTrackSearch200'
 *        '400':
 *          description: parameter validation error
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/responses/getTrack400'
 *        '404':
 *          description: 트랙이 존재하지 않습니다.
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/responses/getTrack404'
 */
router.get(
  "/:trackId",
  param("trackId").custom((value) => {
    if (!ObjectId.isValid(value)) {
      return Promise.reject("잘못된 mongodb ID 입니다.");
    } else {
      return true;
    }
  }),
  async (req, res, next) => {
    // parameter validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const track = await Track.findById(req.params.trackId);
      if (track) {
        // console.log(track.altitude);
        // const maxAltitude = Math.max(...track.altitude);
        // const minAltitude = Math.min(...track.altitude);
        // track.maxAltitude = maxAltitude;
        // track.minAltitude = minAltitude;
        console.log(track);
        res.status(200).json(track);
      } else {
        res.status(404).json({ message: "track이 존재하지 않습니다." });
      }
    } catch (err) {
      console.log(err);
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/tracks:
 *  get:
 *    summary: Retrun 모든트랙의 Id 만 리턴
 *    description: 모든 트랙의 Id 만 리턴함
 *    tags:
 *      - tracks
 *    responses:
 *      '200':
 *        description: array 안에 object 입니다.
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/responses/getTrack200'
 *      '404':
 *        description: 트랙이 존재하지 않음
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/responses/getTrack404'
 *
 */
router.get("/", async (req, res, next) => {
  // 모든 트랙에서 Id 만 리턴
  try {
    const trackId = await Track.find({}).select("id").exec();
    if (!trackId) {
      return res.status(404).json({ message: "트랙이 존재하지 않습니다." });
    }
    return res.status(200).json(trackId);
  } catch (err) {
    console.log(err);
    next(err);
  }
});


module.exports = router;
