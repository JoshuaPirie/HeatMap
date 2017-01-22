var heatDissipationSlider, heatSpreadSlider, brushRadiusSlider, brushIntensitySlider, gridWidthSlider, gridHeightSlider, cellSizeSlider, cellSpacingSlider;
var ellipseButton, numberButton, displayToggle;
var heatMap;

function setup() {
  // scene setup
  frameRate(60);
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB);
  textAlign(CENTER);
  textStyle(BOLD);

  // slider setup
  heatDissipationSlider = createSlider(0, 100, 5);
  heatDissipationSlider.position(20, 40);
  heatSpreadSlider = createSlider(1, 100, 20);
  heatSpreadSlider.position(20, 100);
  brushRadiusSlider = createSlider(0, 50, 3);
  brushRadiusSlider.position(20, 160);
  brushIntensitySlider = createSlider(0, 100, 24);
  brushIntensitySlider.position(20, 220);
  gridWidthSlider = createSlider(1, 50, 36);
  gridWidthSlider.position(20, 280);
  gridHeightSlider = createSlider(1, 30, 24);
  gridHeightSlider.position(20, 340);
  cellSizeSlider = createSlider(1, 50, 20);
  cellSizeSlider.position(20, 400);
  cellSpacingSlider = createSlider(1, 100, 35);
  cellSpacingSlider.position(20, 460);

  // button setup
  displayToggle = true;
  ellipseButton = createButton("Ellipse");
  ellipseButton.position(30, 500);
  ellipseButton.mousePressed(function() {
    ellipseButton.hide();
    numberButton.show();
    displayToggle = false;
  });
  numberButton = createButton("Number");
  numberButton.position(30, 500);
  numberButton.hide();
  numberButton.mousePressed(function() {
    numberButton.hide();
    ellipseButton.show();
    displayToggle = true;
  });

  // heatmap creation
  heatMap = new HeatMap(gridWidthSlider.value(), gridHeightSlider.value());
}

function draw() {
  // if any properties of the heatmap change, recreate it
  if(gridWidthSlider.value() != heatMap.width || gridHeightSlider.value() != heatMap.height)
    heatMap = new HeatMap(gridWidthSlider.value(), gridHeightSlider.value());

  // redraw background for blank canvas
  background(0);

  // update and redraw heatmap
  heatMap.update();
  heatMap.display();

  // draw slider labels
  fill(100);
  noStroke();
  strokeWeight(1);
  text("Heat Dissipation: " + heatDissipationSlider.value(), 108, 28);
  text("Heat Spread: " + heatSpreadSlider.value(), 108, 88);
  text("Brush Radius: " + brushRadiusSlider.value(), 108, 148);
  text("Brush Intensity: " + brushIntensitySlider.value(), 108, 208);
  text("Grid Width: " + gridWidthSlider.value(), 108, 268);
  text("Grid Height: " + gridHeightSlider.value(), 108, 328);
  text("Cell Size: " + cellSizeSlider.value(), 108, 388);
  text("Cell Spacing: " + cellSpacingSlider.value(), 108, 448);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// heatmap constructor
var HeatMap = function(mapWidth, mapHeight) {
  this.width = mapWidth;
  this.height = mapHeight;
  this.temps = [];
  this.newTemps = [];

  // initialize the temp at each point in the grid
  for(var x = 0; x < this.width; x++) {
    this.temps[x] = [];
    this.newTemps[x] = [];
    for(var y = 0; y < this.height; y++)
      this.temps[x][y] = this.newTemps[x][y] = 0;
  }
}

// update function for the heatmap
HeatMap.prototype.update = function() {
  // take a snapshot of all the current temperatures and put them into a new array to be modified
  for(var x = 0; x < this.width; x++)
    for(var y = 0; y < this.height; y++)
      this.newTemps[x][y] = this.temps[x][y];

  // calculate top left point of the heatmap on the screen
  this.startX = (width - ((this.width - 1) * cellSpacingSlider.value())) / 2;
  this.startY = (height - ((this.height - 1) * cellSpacingSlider.value())) / 2;

  // modifies the values of each cell
  for(var x = 0; x < this.width; x++) {
    for(var y = 0; y < this.height; y++) {
      // has a random chance of lowering the temp by one
      if(Math.random() < heatDissipationSlider.value() / 100)
        this.newTemps[x][y]--;

      // works out how to spread the heat in a cell to adjacent cells
      if(this.temps[x][y] > 0) {
        // keeps track of the cells that heat can be dissipated to
        var dissipation = [];

        // checks all four adjacent cells to see if they are lower in temperature
        if(this.temps[x + 1] && this.temps[x + 1][y] < this.temps[x][y])
          dissipation.push([x + 1, y]);
        if(this.temps[x - 1] && this.temps[x - 1][y] < this.temps[x][y])
          dissipation.push([x - 1, y]);
        if(this.temps[x][y + 1] < this.temps[x][y])
          dissipation.push([x, y + 1]);
        if(this.temps[x][y - 1] < this.temps[x][y])
          dissipation.push([x, y - 1]);

        // calculates the average temperature of the cells around the current cell
        var sum = 0;
        for(var i = 0; i < dissipation.length; i++)
          sum += this.temps[dissipation[i][0]][dissipation[i][1]];
        var average = round(sum / dissipation.length);

        // dissipates the heat into available cells until it either runs out of cells or the current cell has dropped below the average temp
        while(dissipation.length > 0 && this.newTemps[x][y] > average) {
          // picks a random cell (so there's no bias if not all cells end up getting heat)
          var index = Math.floor(Math.random() * dissipation.length);
          // calculates the amount of heat to dissipate to the adjacent cell depending on the temperature difference between them
          var amount = ceil((abs(this.newTemps[x][y] - this.newTemps[dissipation[index][0]][dissipation[index][1]]) / 5) * (heatSpreadSlider.value() / 100));
          // updates cell temperatures and removes adjacent cell from the array
          this.newTemps[dissipation[index][0]][dissipation[index][1]] += amount;
          dissipation.splice(index, 1);
          this.newTemps[x][y] -= amount;
        }
      }

      // handles adding heat where the user presses
      if(mouseIsPressed) {
        // calculates the distance from the mouse to the current cell
        var distance = dist(mouseX, mouseY, x * cellSpacingSlider.value() + this.startX, y * cellSpacingSlider.value() + this.startY);
        // if the cell is within a radius of the mouse, add temperature to it based on how close it is
        if(distance < brushRadiusSlider.value() * cellSpacingSlider.value())
          this.newTemps[x][y] += Math.round(map(distance, 0, brushRadiusSlider.value() * cellSpacingSlider.value(), brushIntensitySlider.value(), 0));
      }

      // cap the temp to between 0 and 240
      if(this.newTemps[x][y] > 240)
        this.newTemps[x][y] = 240;
      else if(this.newTemps[x][y] < 0)
        this.newTemps[x][y] = 0;
    }
  }

  // make the new temps the current ones and keep the old temps for use next frame
  var temp = this.temps;
  this.temps = this.newTemps;
  this.newTemps = temp;
}

// display function for the heatmap
HeatMap.prototype.display = function() {
  // set up ellipse or text style
  if(displayToggle) {
    noFill();
    strokeWeight(2);
  }
  else
    strokeWeight(1);

  // draw an ellipse or text for each cell
  for(var x = 0; x < this.width; x++) {
    for(var y = 0; y < this.height; y++) {
      if(displayToggle) {
        stroke(240 - this.temps[x][y], 100, 100);
        ellipse(x * cellSpacingSlider.value() + this.startX, y * cellSpacingSlider.value() + this.startY, cellSizeSlider.value());
      }
      else {
        fill(240 - this.temps[x][y], 100, 100);
        text(this.temps[x][y], x * cellSpacingSlider.value() + this.startX, y * cellSpacingSlider.value() + this.startY, cellSizeSlider.value());
      }
    }
  }
}