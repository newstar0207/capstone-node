class ExerciseRecord {
  constructor({
    trackId,
    name,
    userId,
    gps,
    speed,
    time,
    totalTime,
    distance,
    event,
    altitude,
  }) {
    this.trackId = trackId;
    this.user = { userId, name };
    this.gps = { coordinates: gps };
    this.speed = speed;
    this.time = time;
    this.totalTime = totalTime;
    this.distance = distance;
    this.event = event;
    this.altitude = altitude;
  }
}

module.exports = ExerciseRecord;
