class CollisonsBox {
  constructor(position, size) {
    this.position = position;
    this.size = size;
  }
  draw() {
    c.strokeStyle = debug;
    c.rect(this.position.x, this.position.y, this.size.w, this.size.h);
    c.strokeStyle = "black";
    c.strokeRect(this.position.x, this.position.y, this.size.w, this.size.h);
  }
}

try {
  module.exports = CollisonsBox;
} catch (error) {
  console.error("Error exporting CollisonsBox:", error);
}
