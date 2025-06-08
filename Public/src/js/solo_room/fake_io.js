class FakeIO {
  constructor() {}

  to(room) {
    return this;
  }

  emit(event, data) {
    if (event === "ricochet_explosion") {
      ricochet_sparks(data.position, data.angle, 20);
    } else if (event === "bullet_explosion") {
      bullet_explosion(data.position, 100);
    } else if (event === "shoot_explosion") {
      shoot_explosion(data.position, data.angle, 30);
    } else if (event === "player_explosion" || event === "mine_explosion") {
      explosion(data.position, 100);
    }

    return event + " emitted to room with data: " + JSON.stringify(data);
  }
}
