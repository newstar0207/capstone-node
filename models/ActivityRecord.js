class ActivityRecord {
  constructor(
    {
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
    },
    slope
  ) {
    this.trackId = trackId;
    this.user = { userId, name };
    this.gps = { coordinates: gps };
    this.speed = speed;
    this.time = time;
    this.totalTime = totalTime;
    this.distance = distance;
    this.event = event;
    this.altitude = altitude;
    this.slope = slope;
    this.avgSlope = slope.reduce((sum, item) => sum + item, 0) / slope.length;
  }
}

module.exports = ActivityRecord;
