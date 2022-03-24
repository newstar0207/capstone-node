const express = require("express");
const { body, validationResult, param } = require("express-validator");
const ObjectId = require("mongoose").Types.ObjectId;
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

/**
 * @swagger
 * /api/gpsdata:
 *  get:
 *    summary: Return 모든 gpsdata ID를 리턴함.
 *    tags: [GPSdatas]
 *    responses:
 *      '200':
 *        description: array 안 object 입니다.
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/responses/getGpsData200'
 *      '404':
 *        description: GPSdata가 없을 경우
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/responses/getGpsData404'
 */

router.get("/gpsdata", async (req, res, next) => {
  try {
    const gpsDataId = await GPSdata.find({}).select("id").exec();
    if (gpsDataId.length === 0) {
      return res.status(404).json({ message: "저장된 GPSdata가 없습니다." });
    }

    return res.status(200).json(gpsDataId);
  } catch (err) {
    // database error
    console.log(err);
    next(err);
  }
});

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
 *                $ref: '#/components/responses/postGpsData201'
 *        '400':
 *          description: request body failed
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/responses/postGpsData400'
 */

router.post(
  "/gpsdata",
  body("event")
    .exists()
    .isIn(["R", "B"])
    .withMessage({ message: "event 입력 형식이 잘못되었습니다." }),
  body("speed").exists(),
  body("distance").custom((value) => {
    // 총 거리를 이용해 validation
    if (value[value.length - 1] < 0.1) {
      return Promise.reject("최단거리 100m(0.1) 입니다.");
    } else {
      return true;
    }
  }),
  async (req, res, next) => {
    // body validator error
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

    // speed error
    if (checkSpeedResult === false) {
      return res.status(400).json({ message: "잘못된 속도 데이터 입니다." });
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
      // created
      return res.status(201).json({ gpsDataId: gpsData.id });
    } catch (err) {
      // database error
      console.log(err);
      next(err);
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
 *          description: 검색한 트랙의 결과를 가져옴(gpsData 가 없을 수도 있음 -> null)
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/responses/GPSdataRank'
 *        '400':
 *          description: validator error
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/responses/getTrackRank400'
 *        '404':
 *          description: 해당 트랙이 존재하지 않음
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/responses/getTrackRank404'
 *
 */
router.get(
  "/track/:trackId/rank",
  param("trackId").custom((value) => {
    if (!ObjectId.isValid(value)) {
      return Promise.reject("잘못된 mongodb ID 입니다.");
    } else {
      return true;
    }
  }),
  (req, res, next) => {
    // parameter validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // gpsdata 찾음
    const gpsData = GPSdata.find({ trackId: req.params.trackId })
      .select("user totalTime createdAt")
      .sort({ totalTime: "asc" })
      .exec()
      .then((gpsResult) => {
        // console.log(gpsResult, "1----");
        if (gpsResult.length === 0) {
          return null;
        } else {
          return gpsResult;
        }
      })
      .catch((err) => {
        console.log(err);
        return res.status(404).json({ message: "track 이 존재하지 않음" });
        // next(err);
      });

    // track 찾음
    const trackData = Track.findById(req.params.trackId)
      .exec()
      .then((trackResult) => {
        return trackResult;
      })
      .catch((err) => {
        console.log(err);
        return res.status(404).json({ message: "track 이 존재하지 않음" });
        // next(err);
      });

    // 찾은 track, gpsdata return
    Promise.all([gpsData, trackData])
      .then((result) => {
        console.log(result);
        return res.status(200).json({ rank: result[0], track: result[1] });
      })
      .catch((err) => {
        console.log(err);
      });
  }
);

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
 *        '400':
 *          description: parameter error
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/responses/getGpsData400'
 *        '404':
 *          description: GPSdata 존재하지 않음
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/responses/getGpsData404'
 *
 */

router.get(
  "/gpsdata/:gpsdataId",
  param("gpsdataId").custom((value) => {
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
      const gpsData = GPSdata.findById(req.params.gpsdataId);
      gpsData.exec((err, result) => {
        if (err) {
          console.error(err);
          next(err);
        } else {
          if (!result) {
            return res
              .status(404)
              .json({ message: "gpsData가 존재하지 않습니다." });
          }
          return res.status(200).json(result);
        }
      });
    } catch (err) {
      // database error
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
 *        '400':
 *          description: parameter validation
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/responses/getGpsData400'
 */

router.delete(
  "/gpsdata/:gpsdataId",
  param("gpsdataId").custom((value) => {
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
      await GPSdata.deleteOne({ id: req.params.gpsdataId });
      res.status(200).json({ message: "gpsData를 삭제하였습니다" });
    } catch (err) {
      // database error
      console.error(err);
      next(err);
    }
  }
);

module.exports = router;
