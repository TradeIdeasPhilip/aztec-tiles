/**
 * This is a wrapper around document.getElementById().
 * This ensures that we find the element and that it has the right type or it throws an exception.
 * Note that the return type of the function matches the requested type.
 * @param id Look for an element with this id.
 * @param ty This is the type we are expecting.  E.g. HtmlButtonElement
 */
function getById<T extends Element>(id: string, ty: { new (): T }): T {
  //https://stackoverflow.com/a/64780056/971955
  const found = document.getElementById(id);
  if (!found) {
    throw new Error(
      "Could not find element with id " + id + ".  Expected type:  " + ty.name
    );
  }
  if (found instanceof ty) {
    return found;
  } else {
    throw new Error(
      "Element with id " +
        id +
        " has type " +
        found.constructor.name +
        ".  Expected type:  " +
        ty.name
    );
  }
}

/**
 * The container that holds all of the tiles.
 */
const mainDiv = getById("main", HTMLDivElement);

/**
 * The number of cells we can draw across or down.
 * Use setCellCount() to change this.
 */
let cellCount = 6;

/**
 * 
 * @param newValue Resize our grid.
 */
function setCellCount(newValue : number) {
  if (!isFinite(newValue) || newValue < 1 || newValue != Math.floor(newValue)) {
    throw new RangeError("Expecting a positive number, got: " + newValue);
  }
  cellCount = newValue;
  mainDiv.style.setProperty("--cells", newValue.toString());
}

type PanelInfo = {
  /**
   * How quickly does the css "top" property change?
   * Negative numbers go up.
   * Units are cells / generation.
   */
  dTop : -1 | 0 | 1,
  /**
   * How quickly does the css "left" property change?
   * Negative numbers go to the left.
   * Units are cells / generation.
   */
  dLeft : -1 | 0 | 1,
  /**
   * This is the corresponding DOM object.
   */
  div : HTMLDivElement,
  opposite? : Direction,
  height : 1 | 2,
  width : 1 | 2,
  compareBefore : boolean;
  orientation : "horizontal" | "vertical",
  direction : Direction,
}

const allPanelInfo : Record<Direction, PanelInfo> = {
  new: {direction : "new", dLeft : 0, dTop : 0, div : undefined!, height : 2, width : 2, get compareBefore() : boolean { throw new Error("wtf")}, get orientation() : any { throw new Error("wtf")}},
  top: {direction : "top", dLeft : 0, dTop : -1, div : undefined!, opposite : "bottom", height : 1, width : 2, compareBefore: true, orientation: "horizontal"},
  bottom: {direction : "bottom", dLeft : 0, dTop : 1, div : undefined!, opposite : "top", height : 1, width : 2, compareBefore: false, orientation: "horizontal"},
  left: {direction : "left", dLeft : -1, dTop : 0, div : undefined!, opposite : "right", height : 2, width : 1, compareBefore: true, orientation : "vertical"},
  right: {direction : "right", dLeft : 1, dTop : 0, div : undefined!, opposite: "left", height : 2, width : 1, compareBefore: false, orientation : "vertical"},
}

const directions = Object.keys(allPanelInfo) as Direction[];

/**
 * The height of the diamond is generation * 2.
 */
let generation = 0;

function setGeneration(newValue : number) {
  mainDiv.style.setProperty("--generation", newValue.toString());
  generation = newValue;
}

/**
 * Delete all tiles.
 */
function clearAll() {
  mainDiv.innerText = "";
  Tile.all.clear();
  setGeneration(0);
  directions.forEach(direction => {
    const div = document.createElement("div");
    div.className = "animation-panel";
    const info = allPanelInfo[direction];
    div.style.setProperty("--dtop", info.dTop.toString());
    div.style.setProperty("--dleft", info.dLeft.toString());
    info.div = div;
    mainDiv.appendChild(div);
    /*
    const invisible = document.createElement("div");
    invisible.innerText = info.direction;
    invisible.className = "invisible";
    div.appendChild(invisible);
    */
  });
}

function disableTransitions() {
  mainDiv.classList.add("disable-transitions");
}

function enableTransitions() {
  mainDiv.classList.remove("disable-transitions");
}

/** The type of a tile. */
type Direction = "top" | "bottom" | "left" | "right" | "new";

class Tile {
  readonly div : HTMLDivElement;
  constructor(public readonly panelInfo : PanelInfo, private row : number, private column : number) {
    this.div = document.createElement("div");
    this.div.classList.add("tile");
    this.div.classList.add(panelInfo.direction);
    this.setDivPosition();
    panelInfo.div.appendChild(this.div);
    Tile.all.add(this);
  }
  static create(direction : Direction, row : number, column : number) : Tile {
    return new Tile(allPanelInfo[direction], row, column);
  }
  private setDivPosition() {
    // This is explicitly NOT required when calling moveOnce().
    // Just calling setGeneration() is enough to move the HTML elements.
    // We keep the row and column properties of each JavaScript Tile object up to date in the obvious way.
    // But for performance reasons, normal updates are all done with a single CSS change in setGeneration().
    // This is a huge performance boost because the regular movements are all animated.
    // The animation logic fires many times a second.
    // Now the animation only has to track 4 containers, rather than all of the individual tiles.
    const info = this.panelInfo;
    this.div.style.setProperty("--row", (this.row - generation * info.dTop).toString());
    this.div.style.setProperty("--column", (this.column - generation * info.dLeft).toString());
  }
  addOffset(offset : number) {
    this.row += offset;
    this.column += offset;
    this.keysCache = undefined;
    this.setDivPosition();
  }
  remove() {
    Tile.all.delete(this);
    this.div.remove();
  }
  getRow() { return this. row; }
  getColumn() { return this.column; }
  static readonly all = new Set< Tile >();

  static makeKey(row : number, column : number) : string {
    return row + ":" + column;
  }
  private keysCache? : string[];
  public get keys() : string[] {
    if (!this.keysCache) {
      const info = this.panelInfo;
      this.keysCache = [];
      for (let r = 0; r < info.height; r++) {
        for (let c = 0; c < info.width; c++) {
          this.keysCache.push(Tile.makeKey(this.row + r, this.column + c));
        }
      }
    }
    return this.keysCache;
  }

  moveOnce() {
    const info = this.panelInfo;
    this.row += info.dTop;
    this.column += info.dLeft;
    this.keysCache = undefined;
  }
}

/**
 * Precondition:  There are no "new" tiles on the board.
 */
function moveTilesOnce() {
  setGeneration(generation + 1);

  /**
   * We use this to look for tiles that are crossing each other.
   * We are only storing one copy of each tile, the key comes from the top left position of tile.
   * Note:  We are comparing the original positions of the top tiles to the final positions of the bottom tiles.
   * Same with left vs right.
   */
  const crossingPositions = { horizontal: new Map<string, Tile>(), vertical: new Map<string, Tile>() };
  function checkForCross(tile : Tile) {
    const key = tile.keys[0];
    const orientation =  tile.panelInfo.orientation;
    const other = crossingPositions[orientation].get(key);
    if (other) {
      tile.remove();
      other.remove();
      return true;
    }
    crossingPositions[orientation].set(key, tile);
    return false;
  }

  // Move the tiles and delete any that cross each other.
  Tile.all.forEach(tile => {
    const compareBefore = tile.panelInfo.compareBefore;
    if (compareBefore) {
      if (!checkForCross(tile)) {
        tile.moveOnce();
      }
    } else {
      tile.moveOnce();
      checkForCross(tile);
    }
  });

  /*
    if ((item.row <= 0) || (item.column <= 0)) {
      needResizeSoon = true;
    }
  */
 // TODO something with resize

  // We have deleted anything that needs to be deleted and we have moved anything
  // that needs to be moved.  Now store all of the positions that are currently occupied.
  const occupied = new Set<string>();
  Tile.all.forEach(tile => {
    tile.keys.forEach(key => occupied.add(key));
  });

  /** How many blank lines to leave on the top and on the left */
  const offset = Math.floor(cellCount / 2) - generation;

  // Look for places to add a "new" tile.
  function tryNewTile(row : number, column : number) {
    //console.log("tryNewTile(" + row + ", " + column + ")");
    let keys : string[] = [];
    [column, column + 1].forEach(c => {
      [row, row + 1].forEach(r => {
        keys.push(Tile.makeKey(r, c));
      })
    });
    let conflict = false;
    for (const key of keys) {
      if (occupied.has(key)) {
        conflict = true;
        break;
      }
    }
    if (!conflict) {
      Tile.create("new", row, column);
      keys.forEach(key => occupied.add(key));
    }
  }
  for (let r = 0; r < generation; r++) {
    const row = r + offset;
    const leftOffset = offset + generation - r - 1;
    const width = r * 2 + 1;
    for (let c = 0; c < width; c++) {
      const column = c + leftOffset;
      tryNewTile(row, column);
    }
  }
  for (let r = 1; r < generation; r++) {
    const row = offset + generation + r - 1;
    const leftOffset = offset + r;
    const width = (generation - r) * 2 - 1;
    for (let c = 0; c < width; c++) {
      const column = c + leftOffset;
      tryNewTile(row, column);
    }
  }
}

/**
 * Replace each "new" tile with a pair of matching tiles.
 */
function randomlyFill() {
  Tile.all.forEach(tile => {
    if (tile.panelInfo.direction == "new") {
      const row = tile.getRow();
      const column = tile.getColumn();
      tile.remove();
      if (Math.random() < 0.5) {
        Tile.create("top", row, column);
        Tile.create("bottom", row + 1, column);
      } else {
        Tile.create("left", row, column);
        Tile.create("right", row, column + 1);
      }
    }
  });
}

/**
 * Change the scale.  Keep the tiles centered.
 */
function autoResize() {
  const offset = Math.floor(cellCount/2);
  setCellCount(cellCount * 2);
  Tile.all.forEach(tile => tile.addOffset(offset));
}

function onReset() {
  clearAll();
  setCellCount(8);
}

/** A stack of undo states. */
const undo : { () : void }[] = [];

/**
 * We automatically enable and disable this based on the state of the undo list.
 */
const undoButton = getById("undo", HTMLButtonElement);

/**
 * Grab the current state and push it onto the stack.
 */
function pushUndoItem() {
  if (undo.length == 5) {
    // Don't let the list get too long.  That would be a memory leak.
    undo.shift();
  }
  undo.push(saveState());
  undoButton.disabled = false;
}

/**
 * Call this to pop the most recently pushed item and restore it.
 * It is an error to call this if there are no items on the stack.
 */
function popUndoItem() {
  const toRestore = undo.pop();
  undoButton.disabled = undo.length == 0;
  if (!toRestore) {
    throw new Error("wtf");
  }
  toRestore();
}

/**
 * The user only has one button to do the next step.
 * The button does different things depending on its current state.
 */
function onForward() {
  pushUndoItem();
  if (generation * 2 >= cellCount) {
    // Leave the animations in place.
    // I didn't plan for this case, but it looks mildly amusing, so I'm keeping it.
    autoResize();
  } else if (document.querySelector(".new")) {
    // If there was an animation in progress, end it.
    //   Make everything jump to it's final position.
    // Everything worked before I disabled the transitions, but it was ugly.
    // It was especially confusing in the early stages:
    //   Sometimes a panel was still moving when you added new stuff.
    //   But the panel was empty before.
    //   So it wasn't obvious that it was still moving.
    //   It wasn't obvious what was going on.
    disableTransitions();
    // At this point we replace all "new" tiles with pairs of smaller tiles.
    randomlyFill();
  } else {
    // Make the board grow. 
    // Animate the transitions so you can see exactly where each tile moves to.
    enableTransitions();
    moveTilesOnce();
  }
}

/**
 * Save the current position of all tiles on the board.
 * This returns a function.  Call that function if and when you want to restore the state.
 */
function saveState() {
  const savedCellCount = cellCount;
  const savedGeneration = generation;
  const tiles =  Array.from(Tile.all).map(tile => ({panelInfo : tile.panelInfo, row: tile.getRow(), column: tile.getColumn()}));
  return () => {
    clearAll();
    setCellCount(savedCellCount);
    setGeneration(savedGeneration);
    tiles.forEach(tile => new Tile(tile.panelInfo, tile.row, tile.column));
  };
}

function onUndo() {
  popUndoItem();
}

// When we first start we are in the same state as when the user hits "Reset."
onReset();