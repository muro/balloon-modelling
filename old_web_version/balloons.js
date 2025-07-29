function debug(str) {
  document.getElementById('debug').innerHTML += "<div>" + str + "</div>";
}

var balloons = [];
var pies = 30;

function Balloon(x, y, r, pressure, color) {
  //"use strict"

  this.x = x;
  this.y = y;
  this.r = r;
  this.pressure = pressure;
  this.color = color;
  this.tesselate();
}

Balloon.prototype.tesselate = function() {
  var i;
  var pie_angle = (2 * Math.PI) / pies;
  var current_angle = 0;

  debug("called tesselate");
  this.points_x = []
  this.points_y = []

  for (i = 0; i < pies; i++) {
    this.points_x.push(this.x + this.r * Math.sin(current_angle));
    this.points_y.push(this.y + this.r * Math.cos(current_angle));
    current_angle += pie_angle;
  }
}

Balloon.prototype.findIntersection = function(b2) {
  var d, dx, dy, cd, cx, cy, h, rx, ry;
  dx = b2.x - this.x;
  dy = b2.y - this.y;
  d = Math.hypot(dx, dy);

  if (d > this.r + b2.r) {
    // error
    return;
  }
  if (d < Math.abs(this.r - b2.r)) {
    // also error
    return;
  }
  cd = (this.r * this.r - b2.r * b2.r + d * d) / (2.0 * d);
  cx = this.x + (dx * cd/d);
  cy = this.y + (dy * cd/d);

  h = Math.sqrt(this.r * this.r - cd * cd);
  rx = -dy * (h / d);
  ry = dx * (h / d);

  return [{x: cx + rx, y: cy + ry}, {x: cx - rx, y: cy - ry}];
}

Balloon.prototype.deform = function(b2) {
  var i, distance, vx, vy, a, b, c;

  cdx = b2.x - this.x;
  cdy = b2.y - this.y;
  distance = Math.hypot(cdx, cdy);
  if (distance >= this.r + b2.r) {
    return;
  }
  if (distance < Math.abs(this.r - b2.r)) {
    return;
  }

  // find intersection points:
  points = this.findIntersection(b2);
}

Balloon.prototype.draw = function(ctx) {
  var i;

  debug("Drawing balloon " + this);

  ctx.fillStyle = this.color;
  ctx.strokeStyle = this.color;

  ctx.beginPath();
//  ctx.arc(this.x, this.y, this.r, 0, 2 * Math.PI, true);
  debug("Points: " + this.points_x);

  ctx.moveTo(this.points_x[0], this.points_y[0]);
  for (i = 1; i < this.points_x.length; i++) {
    ctx.lineTo(this.points_x[i], this.points_y[i]);
  }
  ctx.lineTo(this.points_x[0], this.points_y[0]);
  ctx.stroke();
}

function deform_baloons() {
  var i;
  for (i = 1; i < balloons.length; i++) {
    balloons[0].deform(balloons[i]);
  }
}

function draw_balloons() {
  var canvas = document.getElementById("canvas");
  var ctx = canvas.getContext("2d");
  var i;

  ctx.globalCompositeOperation = 'destination-over';
  ctx.clearRect(0, 0, 1500, 1400);
  for (i = 0; i < balloons.length; i++) {
    debug("Drawing balloon " + i);
    balloons[i].draw(ctx);
  }

  for (i = 1; i < balloons.length; i++) {
    ctx.strokeStyle = "blue";
    ctx.beginPath();
    points = balloons[0].findIntersection(balloons[i]);
    debug("Drawing intersection " + i);
    if (points.length > 1) {
      debug("point: " + points[0].x + ", " + points[0].y);
      debug("point: " + points[1].x + ", " + points[1].y);
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
    }
    debug("done");
    ctx.stroke();
  }
}

function single() {
  debug("single");
  balloons = [new Balloon(100, 100, 50, 5, "red")]

  draw_balloons();
}

function two() {
  debug("two");
  balloons = [new Balloon(200, 100, 50, 5, "blue"), new Balloon(100, 200, 50, 5, "yellow")]
  draw_balloons();
}


function overlap() {
  debug("overlap");
  balloons = [new Balloon(200, 100, 100, 5, "#f03"), new Balloon(100, 200, 100, 5, "#aaa")]

  deform_baloons();
  draw_balloons();
}