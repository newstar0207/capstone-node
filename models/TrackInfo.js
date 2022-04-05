class TrackInfo {
  constructor({
    trackName,
    totalDistance,
    name,
    userId,
    description,
    event,
    gps,
    altitude,
    checkPoint,
  }) {
    this.trackName = trackName;
    this.totalDistance = totalDistance;
    this.user = { name, userId };
    this.description = description;
    this.event = event;
    this.gps = { coordinates: gps };
    this.altitude = altitude;
    this.checkPoint = checkPoint;
    this.start_latlng = { coordinates: gps[0] };
    this.end_latlng = { coordinates: gps[gps.length - 1] };
  }
}

module.exports = TrackInfo;
