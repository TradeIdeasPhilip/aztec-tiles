
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
 * We have hit the bounds of our drawing area.  We need more space.
 */
let needResizeSoon = false;

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
  needResizeSoon = false;
}

/**
 * Delete all tiles.
 */
function clearAll() {
  mainDiv.innerText = "";
}

/** The type of a tile. */
type Direction = "top" | "bottom" | "left" | "right" | "new";

function createTile(direction : Direction, row : number, column : number) {
  const tile = document.createElement("div");
  tile.classList.add("tile");
  tile.classList.add(direction);
  tile.dataset.direction = direction;
  tile.style.setProperty("--row", row.toString());
  tile.style.setProperty("--column", column.toString());
  mainDiv.appendChild(tile);
  return tile;
}

function oppositeDirection(direction : Direction) : Direction {
  switch (direction) {
    case "top" : return "bottom";
    case "bottom" : return "top";
    case "left" : return "right";
    case "right" : return "left";
  }
  throw new Error("wtf");
}

/**
 * Precondition:  There are no "new" tiles on the board.
 */
function moveTilesOnce() {
  function makeKey(row : number, column : number) : string {
    return row + ":" + column;
  }

  /**
   * These are places where we expect to see a tile in at the end of this function.
   * That includes every place that is currently in use, and every place adjacent to a place that is currently in use.
   * This algorithm is inefficent.  We make no assumptions about the shape of the board.
   * 
   * Note:  See README.md before trying to optimize this code!
   */
  const possiblePositions = new Map<string, { row: number, column : number }>();

  /**
   * Put the given value into possiblePositions.
   * @param row 
   * @param column 
   */
  function savePossiblePosition(row : number, column : number) {
    possiblePositions.set(makeKey(row, column), {row, column});
  }

  /**
   * The position of each tile before the move.  
   * We use this to look for tiles that are crossing each other.
   * We are only storing one copy of each tile.
   * The key comes from the top left position of tile.
   * row, column, and keys all describe the new position, after the move.
   * Note:  If we delete a tile, it gets deleted from this Map, too.
   */
  const originalPositions = new Map<string, { element : HTMLDivElement, direction : Direction, keys : string[], row: number, column : number }>();

  /**
   * Remove these elements from the screen.
   * Save these and handle them all at once.
   * That can simplify the animation.
   * Also, if we throw an exception, usually nothing changes.
   * It's like all of our changes are wrapped in a transaction because we don't
   * try to apply any of them until the end.
   */
  const toDelete = new Set<HTMLDivElement>();

  const tiles = document.querySelectorAll(".tile");
  tiles.forEach(element => {
    if (element instanceof HTMLDivElement) {
      let row = +element.style.getPropertyValue("--row");
      let column = +element.style.getPropertyValue("--column");
      const direction = element.dataset.direction;
      const originalKey = makeKey(row, column);
      savePossiblePosition(row, column);

      /**
       * This key describes the cell on the right or the bottom of a tile.
       */
      let secondKey : string;

      switch (direction) {
        case "top": {
          savePossiblePosition(row, column + 1);
          row--;
          secondKey = makeKey(row, column + 1);
          break;
        }
        case "bottom": {
          savePossiblePosition(row, column + 1);
          row++;
          secondKey = makeKey(row, column + 1);
          break;
        }
        case "left": {
          savePossiblePosition(row + 1, column);
          column--;
          secondKey = makeKey(row + 1, column);
          break;
        }
        case "right": {
          savePossiblePosition(row + 1, column);
          column++;
          secondKey = makeKey(row + 1, column);
          break;
        }
        default: {
          // Precondition:  When you call this function, there should be no "new" tiles.
          throw new Error("wtf");
        }
      }

      /**
       * This key describes the cell on the top left of a tile.
       */
      const firstKey = makeKey(row, column);
      const possibleConflict = originalPositions.get(firstKey);
      if (possibleConflict && (possibleConflict.direction == oppositeDirection(direction))) {
        // If two adjacent tiles are trying to swap places with each other, we delete them both.
        toDelete.add(possibleConflict.element);
        toDelete.add(element);
        originalPositions.delete(firstKey);
      } else {
        // Track this tile.  Either we will find a conflict in a future iteration of this loop
        // or we will move the tile after this loop finishes.
        originalPositions.set(originalKey, { element, direction, keys: [firstKey, secondKey], row, column });
      }
    }
  });

  /**
   * Where we are planning to move each tile.
   * We use this to say which positions are free.
   */
  const newPositions = new Set<string>();
  originalPositions.forEach(tile => {
    tile.keys.forEach(key => newPositions.add(key));
  });

  // If we said we were going to delete a tile, do it now.
  toDelete.forEach(element => {
    // TODO add animation.
    element.remove();
  });

  // If we said we were going to move a tile, move it now.
  // We could have done it sooner, but that might have confused some animations.
  // If I was planning to move a tile, then I changed my mind and wanted to
  // delete that tile instead, I want to do the delete animation INSTEAD of
  // the move animation.  When we first stored the value in orgininalPositions
  // we couldn't be sure which animation we were going to do.  Now we are sure.
  originalPositions.forEach(item => {
    const style = item.element.style;
    style.setProperty("--row", item.row.toString());
    style.setProperty("--column", item.column.toString());
    if ((item.row <= 0) || (item.column <= 0)) {
      needResizeSoon = true;
    }
  })

  // We already have a list of all the cells that where in use before this function call.
  // Now we need to add all of the immediate neighbors.
  Array.from(possiblePositions.values()).forEach(location => {
    const { row, column } = location;
    savePossiblePosition(row - 1, column);
    savePossiblePosition(row + 1, column);
    savePossiblePosition(row, column - 1);
    savePossiblePosition(row, column + 1);
  });

  /**
   * This is the same data as possiblePositions, but it's been sorted.
   * You walk though these positions like English text, the first row
   * before the second row, left to right within a row.
   */
  const possibleBlanks = Array.from(possiblePositions);
  possibleBlanks.sort((a, b) => {
    const firstCompare = a[1].row - b[1].row;
    if (firstCompare) {
      return firstCompare;
    } else {
      return a[1].column - b[1].column;
    }
  });

  /**
   * This says which cells are occupied by a "new" tile.
   */
  const blankAdded = new Set<string>();
  possibleBlanks.forEach(item => {
    const key = item[0];
    if (!(newPositions.has(key) || blankAdded.has(key))) {
      const row = item[1].row;
      const column = item[1].column;
      createTile("new", row, column);
      [row, row+1].forEach(r => {
        [column, column + 1].forEach(c=> {
          const k = makeKey(r, c);
          if (blankAdded.has(k)) {
            throw new Error("wtf");
          }
          if (newPositions.has(k)) {
            throw new Error("wtf");
          }
          blankAdded.add(k);
        });
      });
    }
  });
}

/**
 * Replace each "new" tile with a pair of matching tiles.
 */
function randomlyFill() {
  document.querySelectorAll(".new").forEach(element => {
    if (element instanceof HTMLDivElement) {
      const row = +element.style.getPropertyValue("--row");
      const column = +element.style.getPropertyValue("--column");
      element.remove();
      if (Math.random() < 0.5) {
        createTile("top", row, column);
        createTile("bottom", row + 1, column);
      } else {
        createTile("left", row, column);
        createTile("right", row, column + 1);
      }
    }
  });
}

/**
 * Put a new tile in the center.
 */
function addInitial() {
  const center = Math.floor((cellCount - 1) / 2);
  createTile("new", center, center);
}

/**
 * Change the scale.  Keep the tiles centered.
 */
function autoResize() {
  const offset = Math.floor(cellCount/2);
  setCellCount(cellCount * 2);
  document.querySelectorAll(".tile").forEach(tile => {
    if (tile instanceof HTMLDivElement) {
      let row = +tile.style.getPropertyValue("--row");
      let column = +tile.style.getPropertyValue("--column");
      row += offset;
      column += offset;
      tile.style.setProperty("--row", row.toString());
      tile.style.setProperty("--column", column.toString());
    }
  });
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
  if (needResizeSoon) {
    autoResize();
  } else if (mainDiv.childElementCount == 0) {
    addInitial();
  } else if (document.querySelector(".new")) {
    randomlyFill();
  } else {
    moveTilesOnce();
  }
}

/**
 * Save the current position of all tiles on the board.
 * This returns a function.  Call that function if and when you want to restore the state.
 */
function saveState() {
  // TODO / BUG
  // Steps to repeat
  // Hit forward until the screen resizes.
  // Hit undo once.
  // Hit forward again.
  //  It should have resized but it did't.
  //  It will skip to the next step and fill in the "new" tiles.
  //  If you're not paying attention you won't notice the problem yet.
  // Hit forward again.
  //  Now some tiles are moved off the edge of the screen.
  //  Now it's obvious that there's a problem!
  const savedCellCount = cellCount;
  const tiles = [] as { direction : Direction, row : number, column: number}[];
   document.querySelectorAll(".tile").forEach(element => {
    if (!(element instanceof HTMLDivElement)) {
      throw new Error("wtf")
    }
    const direction = (element.dataset.direction ?? "new") as Direction;
    const row = +element.style.getPropertyValue("--row");
    const column = +element.style.getPropertyValue("--column");
    tiles.push({direction, row, column});
  });
  return () => {
    clearAll();
    setCellCount(savedCellCount);
    tiles.forEach(tile => createTile(tile.direction, tile.row, tile.column));
  };
}

function onUndo() {
  popUndoItem();
}

// When we first start we are in the same state as when the user hits "Reset."
onReset();