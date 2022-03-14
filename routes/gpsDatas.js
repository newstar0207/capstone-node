const express = require("express");
const { body, validationResult, query, param } = require("express-validator");
const GPSdata = require("../schemas/gpsData");
const Track = require("../schemas/track");
const { checkToken } = require("./middlewares");
/**
 * @swagger
 * tags:
 *   name: GPSdatas
 *   description: GPSdata 관리에 관한 API
 */

const router = express.Router();

// router.get("/test", () => {
//   console.log("test 실행중.........");
//   const gpsdatas = GPSdata.aggregate([
//     {
//       $group: { _id: "$trackId", count: { $count: {} } },
//     },
//   ]);
//   gpsdatas.exec((err, result) => {
//     if (err) {
//       console.log(err);
//     } else {
//       console.log(result);
//     }
//   });
// });

/**
 *  @swagger
 *  /api/gpsdata:
 *    post:
 *      summary: Add GPSdata를 저장하고 ID 를 리턴함.
 *      tags: [GPSdatas]
 *      requestBody:
 *        required: true
 *        description: "자전거: B, 달리기: R"
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/GPSdatas'
 *      responses:
 *        '201':
 *          description: OK
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/responses/GPSdata'
 */

router.post(
  "/gpsdata",
  body("event")
    .exists()
    .isIn(["R", "B"])
    .withMessage({ message: "event 입력 형식이 잘못되었습니다." }),
  body("speed")
    .exists()
    .custom((speed) => {
      console.log(speed.length);
      if (speed.length <= 2) {
      }
    })
    .withMessage({ message: "speed 입력 형식이 잘못되었습니다." }),
  async (req, res, next) => {
    // 속도 체크: 자전거로 달렸을때 속도가 144 이상 나온 경우, 달리기로 44 이상 나온 경우

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let checkSpeedResult = false;

    if (req.body.event === "R") {
      checkSpeedResult = checkSpeedRun(req.body.speed);
    } else {
      checkSpeedResult = checkSpeedBike(req.body.speed);
    }

    if (checkSpeedResult === false) {
      return res.json({ message: "올바르지 않은 데이터 입니다." });
    }

    try {
      const gpsData = await GPSdata.create({
        trackId: req.body.trackId,
        user: { name: req.body.name, userId: req.body.userId },
        gps: { coordinates: req.body.gps }, // gps 좌표
        speed: req.body.speed,
        time: req.body.time,
        totalTime: req.body.totalTime,
        distance: req.body.distance,
        event: req.body.event,
        altitude: req.body.altitude,
      });
      console.log(gpsData);
      return res
        .status(201)
        .json({ gpsId: gpsData.id, message: "gpsData를 저장합니다." });
    } catch (err) {
      return res.json({
        message: "gpsData 생성에 실패하였습니다.",
        error: err.message,
      });
    }
  }
);

const checkSpeedRun = (speeds) => {
  for (let speed of speeds) {
    if (speed >= 44) {
      console.log(speed);
      return false;
    }
  }
  return true;
};

const checkSpeedBike = (speeds) => {
  for (let speed of speeds) {
    if (speed >= 144) {
      console.log(speed);
      return false;
    }
  }
  return true;
};

/**
 *  @swagger
 *  /api/track/{trackId}/rank:
 *    get:
 *      summary: Return 선택한 트랙의 GPSdata를 시간순으로 정렬하고 그 트랙도 같이 리턴
 *      parameters:
 *        - in: query
 *          name: trackId
 *          required: true
 *          example: 622561232d6ee07c40f75bda
 *      tags:
 *        - GPSdatas
 *      responses:
 *        '200':
 *          description: 검색한 트랙의 결과를 가져옴
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/responses/GPSdataRank'
 */
router.get(
  "/track/:trackId/rank",
  param("trackId")
    .exists()
    .withMessage({ message: "trackId의 입력형식이 잘못되었습니다." }),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const TrackResult = await Track.findById(req.params.trackId);
      const GPSdatas = GPSdata.find({ trackId: req.params.trackId })
        .select("user totalTime createdAt")
        .sort({ totalTime: "asc" });
      GPSdatas.exec((err, result) => {
        if (err) {
          console.error(err);
          next(err);
        } else {
          if (result.length == 0) {
            return res.status(200).json({
              rank: "gpsData가 존재하지 않습니다.",
              track: TrackResult,
            });
          }
          return res.status(200).json({ rank: result, track: TrackResult });
        }
      });
    } catch (err) {
      console.log(err);
      next(err);
    }
  }
);

// TODO: 팔로우 한 사람만 나오는 트랙별 랭킹 (시간 순)

/**
 *  @swagger
 *  /api/gpsdata/{gpsdataId}:
 *    get:
 *      summary: Return 특정한 GPSdata를 리턴
 *      tags:
 *        - GPSdatas
 *      parameters:
 *        - in: path
 *          name: gpsdataId
 *          required: true
 *          example: 62256147dc2958292cb17110
 *      responses:
 *        '200':
 *          description: OK
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/GPSdatas'
 */

router.get(
  "/gpsdata/:gpsdataId",
  param("gpsdataId")
    .exists()
    .withMessage({ message: "gpsdataId 의 입력 형식이 잘못되었습니다." }),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const paceMaker = GPSdata.findById(req.params.gpsdataId);
      paceMaker.exec((err, result) => {
        if (err) {
          console.error(err);
          next(err);
        } else {
          console.log(result);
          if (!result) {
            return res
              .status(200)
              .json({ message: "gpsData가 존재하지 않습니다." });
          }
          return res.status(200).json(result);
        }
      });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
);

/**
 *  @swagger
 *  /api/gpsdata/{gpsdataId}:
 *    delete:
 *      summary: Delete 특정한 GPSdata를 삭제함
 *      tags:
 *        - GPSdatas
 *      parameters:
 *        - in: path
 *          name: gpsdataId
 *          required: true
 *          example: 62256147dc2958292cb17110
 *      responses:
 *        '200':
 *          description: OK
 */

router.delete(
  "/gpsdata/:gpsdataId",
  param("gpsdataId")
    .exists()
    .withMessage({ message: "gpsdataId 의 입력형식이 잘못되었습니다." }),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      await GPSdata.deleteOne({ id: req.params.gpsdataId });
      res.status(200).json({ message: "gpsData를 삭제하였습니다" });
    } catch (err) {
      console.error(err);
      next(err);
    }
  }
);

module.exports = router;
