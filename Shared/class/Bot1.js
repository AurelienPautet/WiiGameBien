class Bot1 extends Bot {
  constructor(position, socketid, name, turretc, bodyc) {
    super(position, socketid, name, turretc, bodyc);
    this.shoot_max_bounce = 3;

    this.min_interval_shoot = 170;
    this.max_rotation_speed = Math.PI / 200;
    this.max_bulletcount = 3;
    this.shoot_speed = 5;
    this.precision = 0.4; //default 0.2
    this.number_of_rays = 50;
    this.size_of_rays = 10;
    this.steps_of_rays = 10;
    this.can = {
      move: false,
      shoot: true,
      plant: true,
      spam: true,
    };
  }
}
