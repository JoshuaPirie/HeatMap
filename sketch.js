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
  heatSpreadSlider = createSlider(1, 100, 8);
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
  heatMap = new HeatMap(gridWidthSlider.value(), gridHeightSlider.value(), cellSizeSlider.value(), cellSpacingSlider.value());
}

function draw() {
  // if any properties of the heatmap change, recreate it
  if(gridWidthSlider.value() != heatMap.width || gridHeightSlider.value() != heatMap.height || cellSizeSlider.value() != heatMap.cellSize || cellSpacingSlider.value() != heatMap.cellSpacing)
    heatMap = new HeatMap(gridWidthSlider.value(), gridHeightSlider.value(), cellSizeSlider.value(), cellSpacingSlider.value());

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
  // resize canvas and reposition heatmap on canvas
  resizeCanvas(windowWidth, windowHeight);
  heatMap.reposition();
}

// heatmap constructor
var HeatMap = function(mapWidth, mapHeight, cellSize, cellSpacing) {
  this.width = mapWidth;
  this.height = mapHeight;
  this.cellSize = cellSize;
  this.cellSpacing = cellSpacing;
  this.cells = [];
  this.newCells = [];

  // calculate top left point of where to draw heatmap from
  var startX = (width - ((this.width - 1) * this.cellSpacing)) / 2;
  var startY = (height - ((this.height - 1) * this.cellSpacing)) / 2;

  // add a cell at each point in the grid
  for(var x = 0; x < this.width; x++) {
    this.cells[x] = [];
    this.newCells[x] = [];
    for(var y = 0; y < this.height; y++) {
      this.cells[x][y] = new Cell(x * this.cellSpacing + startX, y * this.cellSpacing + startY);
      this.newCells[x][y] = new Cell(x * this.cellSpacing + startX, y * this.cellSpacing + startY);
    }
  }
}

// update function for the heatmap
HeatMap.prototype.update = function() {
  // take a snapshot of all the current temperatures of each cell and put them into a new array to be modified
  for(var x = 0; x < this.width; x++)
    for(var y = 0; y < this.height; y++)
      this.newCells[x][y].temp = this.cells[x][y].temp;

  // modified the values of each cell
  for(var x = 0; x < this.width; x++) {
    for(var y = 0; y < this.height; y++) {
      // has a random chance of lowering the temperature of the cell by one
      if(Math.random() < heatDissipationSlider.value() / 100)
        this.newCells[x][y].temp--;

      // works out how to spread the heat in a cell to adjacent cells
      if(this.cells[x][y].temp > 0) {
        // keeps track of the cells that heat can be dissipated to
        var dissipation = [];

        // checks all four adjacent cells to see if they are lower in temperature
        if(this.cells[x + 1] && this.cells[x + 1][y].temp < this.cells[x][y].temp)
          dissipation.push(this.newCells[x + 1][y]);
        if(this.cells[x - 1] && this.cells[x - 1][y].temp < this.cells[x][y].temp)
          dissipation.push(this.newCells[x - 1][y]);
        if(this.cells[x][y + 1] && this.cells[x][y + 1].temp < this.cells[x][y].temp)
          dissipation.push(this.newCells[x][y + 1]);
        if(this.cells[x][y - 1] && this.cells[x][y - 1].temp < this.cells[x][y].temp)
          dissipation.push(this.newCells[x][y - 1]);

        // calculates the average temperature of the cells around the current cell
        var sum = 0;
        for(var i = 0; i < dissipation.length; i++)
          sum += dissipation[i].temp;
        var average = round(sum / dissipation.length);

        // dissipates the heat into available cells until it either runs out of cells or the current cell has dropped below the average temp
        while(dissipation.length > 0 && this.newCells[x][y].temp > average) {
          // picks a random cell (so there's no bias if not all cells end up getting heat)
          var index = Math.floor(Math.random() * dissipation.length);
          // calculates the amount of heat to dissipate to the adjacent cell depending on the temperature difference between them
          var amount = ceil((this.newCells[x][y].temp - dissipation[index].temp) / heatSpreadSlider.value());
          // updates cell temperatures and removes adjacent cell from the array
          dissipation[index].temp += amount;
          dissipation.splice(index, 1);
          this.newCells[x][y].temp -= amount;
        }
      }

      // handles adding heat where the user presses
      if(mouseIsPressed) {
        // calculates the distance from the mouse to the current cell
        var distance = dist(mouseX, mouseY, this.newCells[x][y].posX, this.newCells[x][y].posY);
        // if the cell is within a radius of the mouse, add temperature to it based on how close it is
        if(distance < brushRadiusSlider.value() * this.cellSpacing)
          this.newCells[x][y].temp += Math.round(map(distance, 0, brushRadiusSlider.value() * this.cellSpacing, brushIntensitySlider.value(), 0));
      }

      // cap the temperature to between 0 and 240
      if(this.newCells[x][y].temp > 240)
        this.newCells[x][y].temp = 240;
      else if(this.newCells[x][y].temp < 0)
        this.newCells[x][y].temp = 0;
    }
  }

  // make the new cells the current ones and keep the old cells for use next frame
  var temp = this.cells;
  this.cells = this.newCells;
  this.newCells = temp;
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
        stroke(240 - this.cells[x][y].temp, 100, 100);
        ellipse(this.cells[x][y].posX, this.cells[x][y].posY, this.cellSize);
      }
      else {
        fill(240 - this.cells[x][y].temp, 100, 100);
        text(this.cells[x][y].temp, this.cells[x][y].posX, this.cells[x][y].posY);
      }
    }
  }
}

// calculates the new positions of each cell after a screen resize
HeatMap.prototype.reposition = function() {
  var startX = (width - ((this.width - 1) * this.cellSpacing)) / 2;
  var startY = (height - ((this.height - 1) * this.cellSpacing)) / 2;
  for(var x = 0; x < this.width; x++) {
    for(var y = 0; y < this.height; y++) {
      this.cells[x][y].posX = this.newCells[x][y].posX = x * this.cellSpacing + startX;
      this.cells[x][y].posY = this.newCells[x][y].posY = y * this.cellSpacing + startY;
    }
  }
}

// cell constructor
var Cell = function(posX, posY) {
  this.posX = posX;
  this.posY = posY;
  this.temp = 0;
}