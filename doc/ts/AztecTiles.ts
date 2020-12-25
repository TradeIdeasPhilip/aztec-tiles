
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

const mainDiv = getById("main", HTMLDivElement);

let cellCount = 6;
let needResizeSoon = false;

function setCellCount(newValue : number) {
  if (!isFinite(newValue) || newValue < 1 || newValue != Math.floor(newValue)) {
    throw new RangeError("Expecting a positive number, got: " + newValue);
  }
  cellCount = newValue;
  mainDiv.style.setProperty("--cells", newValue.toString());
  needResizeSoon = false;
}

function clearAll() {
  mainDiv.innerText = "";
}

type Direction = "top" | "bottom" | "left" | "right" | "new";

function createTile(direction : Direction, row : number, column : number) {
  const tile = document.createElement("div");
  tile.classList.add("tile");
  tile.classList.add(direction);
  if (direction != "new") {
    tile.dataset.direction = direction;
  }
  tile.style.setProperty("--row", row.toString());
  tile.style.setProperty("--column", column.toString());
  mainDiv.appendChild(tile);
  return tile;
}

function createTestTiles() {
  /*
  createTile("top", 0, 0);
  createTile("right", 0, 2);
  createTile("bottom", 2, 1);
  createTile("left", 1, 0);
  */
  setCellCount(8);
  createTile("top", 2, 3);
  createTile("left", 3, 3);
  createTile("right", 3, 4);
  createTile("bottom", 5, 3);
}

function moveTilesOnce() {
  function makeKey(row : number, column : number) : string {
    return row + ":" + column;
  }
  const oldPositions = new Map<string, { row: number, column : number }>();
  function saveOld(row : number, column : number) {
    oldPositions.set(makeKey(row, column), {row, column});
  }
  const newPositions = new Map<string, { element : HTMLDivElement, row : number, column : number}>();
  const toDelete = new Set<HTMLDivElement>();
  const tiles = document.querySelectorAll(".tile[data-direction]");
  tiles.forEach(element => {
    if (element instanceof HTMLDivElement) {
      let row = +element.style.getPropertyValue("--row");
      let column = +element.style.getPropertyValue("--column");
      saveOld(row, column);
      let secondKey : string;
      switch (element.dataset.direction) {
        case "top": {
          saveOld(row, column + 1);
          row--;
          secondKey = makeKey(row, column + 1);
          break;
        }
        case "bottom": {
          saveOld(row, column + 1);
          row++;
          secondKey = makeKey(row, column + 1);
          break;
        }
        case "left": {
          saveOld(row + 1, column);
          column--;
          secondKey = makeKey(row + 1, column);
          break;
        }
        case "right": {
          saveOld(row + 1, column);
          column++;
          secondKey = makeKey(row + 1, column);
          break;
        }
        default: {
          throw new Error("wtf");
        }
      }
      const firstKey = makeKey(row, column);
      const conflict = newPositions.get(firstKey);
      if (conflict !== newPositions.get(secondKey)) {
        throw new Error("wtf");
      }
      if (conflict) {
        toDelete.add(conflict.element);
        toDelete.add(element);
        newPositions.delete(firstKey);
        newPositions.delete(secondKey);
      } else {
        newPositions.set(firstKey, { element, row, column });
        newPositions.set(secondKey, { element, row, column });
      }
    }
  });
  toDelete.forEach(element => {
    // TODO add animation.
    element.remove();
  });
  newPositions.forEach(item => {
    const style = item.element.style;
    style.setProperty("--row", item.row.toString());
    style.setProperty("--column", item.column.toString());
    if ((item.row <= 0) || (item.column <= 0)) {
      needResizeSoon = true;
    }
  })
  const possibleBlanks = Array.from(oldPositions);
  possibleBlanks.sort((a, b) => {
    const firstCompare = a[1].row - b[1].row;
    if (firstCompare) {
      return firstCompare;
    } else {
      return a[1].column - b[1].column;
    }
  });
  const blankAdded = new Set<string>();
  possibleBlanks.forEach(item => {
    const key = item[0];
    if (!(newPositions.has(key) || blankAdded.has(key))) {
      const row = item[1].row;
      const column = item[1].column;
      createTile("new", row, column);
      [row, row+1].forEach(r => {
        [column, column + 1].forEach(c=> {
          blankAdded.add(makeKey(r, c));
        });
      });
    }
  });
}

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

function addInitial() {
  const center = Math.floor((cellCount - 1) / 2);
  createTile("new", center, center);
}

function autoResize() {
  const offset = Math.floor(cellCount/2);
  setCellCount(cellCount * 2);
  document.querySelectorAll(".grid").forEach(tile => {
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

function onForward() {
  if (needResizeSoon) {
    autoResize();
  } else if (mainDiv.childElementCount == 0) {
    addInitial();
  } else if (document.querySelector(".new")) {
    randomlyFill();
  } else {
    moveTilesOnce();
  }
  // TODO rescale as needed.
}

onReset();