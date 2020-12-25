"use strict";
/**
 * This is a wrapper around document.getElementById().
 * This ensures that we find the element and that it has the right type or it throws an exception.
 * Note that the return type of the function matches the requested type.
 * @param id Look for an element with this id.
 * @param ty This is the type we are expecting.  E.g. HtmlButtonElement
 */
function getById(id, ty) {
    //https://stackoverflow.com/a/64780056/971955
    var found = document.getElementById(id);
    if (!found) {
        throw new Error("Could not find element with id " + id + ".  Expected type:  " + ty.name);
    }
    if (found instanceof ty) {
        return found;
    }
    else {
        throw new Error("Element with id " +
            id +
            " has type " +
            found.constructor.name +
            ".  Expected type:  " +
            ty.name);
    }
}
/**
 * The container that holds all of the tiles.
 */
var mainDiv = getById("main", HTMLDivElement);
/**
 * The number of cells we can draw across or down.
 * Use setCellCount() to change this.
 */
var cellCount = 6;
/**
 * We have hit the bounds of our drawing area.  We need more space.
 */
var needResizeSoon = false;
/**
 *
 * @param newValue Resize our grid.
 */
function setCellCount(newValue) {
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
function createTile(direction, row, column) {
    var tile = document.createElement("div");
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
function oppositeDirection(direction) {
    switch (direction) {
        case "top": return "bottom";
        case "bottom": return "top";
        case "left": return "right";
        case "right": return "left";
    }
    throw new Error("wtf");
}
function moveTilesOnce() {
    function makeKey(row, column) {
        return row + ":" + column;
    }
    /**
     * These are places where we expect to see a tile in at the end of this function.
     * That includes every place that is currently in use, and every place adjacent to a place that is currently in use.
     * This algorithm is inefficent.  We make no assumptions about the shape of the board.
     */
    var possiblePositions = new Map();
    /**
     * Put the given value into possiblePositions.
     * @param row
     * @param column
     */
    function savePossiblePosition(row, column) {
        possiblePositions.set(makeKey(row, column), { row: row, column: column });
    }
    /**
     * The position of each tile before the move.
     * We use this to look for tiles that are crossing each other.
     * We are only storing one copy of each tile.
     * The key comes from the top left position of tile.
     * row, column, and keys all the new position, after the move.
     */
    var originalPositions = new Map();
    var toDelete = new Set();
    var tiles = document.querySelectorAll(".tile[data-direction]");
    tiles.forEach(function (element) {
        if (element instanceof HTMLDivElement) {
            var row = +element.style.getPropertyValue("--row");
            var column = +element.style.getPropertyValue("--column");
            var direction = element.dataset.direction;
            var originalKey = makeKey(row, column);
            savePossiblePosition(row, column);
            var secondKey = void 0;
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
                    throw new Error("wtf");
                }
            }
            var firstKey = makeKey(row, column);
            var possibleConflict = originalPositions.get(firstKey);
            if (possibleConflict && (possibleConflict.direction == oppositeDirection(direction))) {
                toDelete.add(possibleConflict.element);
                toDelete.add(element);
                originalPositions.delete(firstKey);
            }
            else {
                originalPositions.set(originalKey, { element: element, direction: direction, keys: [firstKey, secondKey], row: row, column: column });
            }
        }
    });
    /**
     * Where we are planning to move each tile.
     * We use this to say which positions are free.
     */
    var newPositions = new Set();
    originalPositions.forEach(function (tile) {
        tile.keys.forEach(function (key) { return newPositions.add(key); });
    });
    toDelete.forEach(function (element) {
        // TODO add animation.
        element.remove();
    });
    originalPositions.forEach(function (item) {
        var style = item.element.style;
        style.setProperty("--row", item.row.toString());
        style.setProperty("--column", item.column.toString());
        if ((item.row <= 0) || (item.column <= 0)) {
            needResizeSoon = true;
        }
    });
    // We already have a list of all the cells that where in use before this function call.
    // Now we need to add all of the immediate neighbors.
    Array.from(possiblePositions.values()).forEach(function (location) {
        var row = location.row, column = location.column;
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
    var possibleBlanks = Array.from(possiblePositions);
    possibleBlanks.sort(function (a, b) {
        var firstCompare = a[1].row - b[1].row;
        if (firstCompare) {
            return firstCompare;
        }
        else {
            return a[1].column - b[1].column;
        }
    });
    /**
     * This says which cells are occupied by a "new" tile.
     */
    var blankAdded = new Set();
    possibleBlanks.forEach(function (item) {
        var key = item[0];
        if (!(newPositions.has(key) || blankAdded.has(key))) {
            var row = item[1].row;
            var column_1 = item[1].column;
            createTile("new", row, column_1);
            [row, row + 1].forEach(function (r) {
                [column_1, column_1 + 1].forEach(function (c) {
                    var k = makeKey(r, c);
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
function randomlyFill() {
    document.querySelectorAll(".new").forEach(function (element) {
        if (element instanceof HTMLDivElement) {
            var row = +element.style.getPropertyValue("--row");
            var column = +element.style.getPropertyValue("--column");
            element.remove();
            if (Math.random() < 0.5) {
                createTile("top", row, column);
                createTile("bottom", row + 1, column);
            }
            else {
                createTile("left", row, column);
                createTile("right", row, column + 1);
            }
        }
    });
}
function addInitial() {
    var center = Math.floor((cellCount - 1) / 2);
    createTile("new", center, center);
}
function autoResize() {
    var offset = Math.floor(cellCount / 2);
    setCellCount(cellCount * 2);
    document.querySelectorAll(".tile").forEach(function (tile) {
        if (tile instanceof HTMLDivElement) {
            var row = +tile.style.getPropertyValue("--row");
            var column = +tile.style.getPropertyValue("--column");
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
var undo = function () { console.log("Nothing to undo"); };
function onForward() {
    undo = saveState();
    if (needResizeSoon) {
        autoResize();
    }
    else if (mainDiv.childElementCount == 0) {
        addInitial();
    }
    else if (document.querySelector(".new")) {
        randomlyFill();
    }
    else {
        moveTilesOnce();
    }
    // TODO rescale as needed.
}
function saveState() {
    var savedCellCount = cellCount;
    var tiles = [];
    document.querySelectorAll(".tile").forEach(function (element) {
        var _a;
        if (!(element instanceof HTMLDivElement)) {
            throw new Error("wtf");
        }
        var direction = ((_a = element.dataset.direction) !== null && _a !== void 0 ? _a : "new");
        var row = +element.style.getPropertyValue("--row");
        var column = +element.style.getPropertyValue("--column");
        tiles.push({ direction: direction, row: row, column: column });
    });
    return function () {
        clearAll();
        setCellCount(savedCellCount);
        tiles.forEach(function (tile) { return createTile(tile.direction, tile.row, tile.column); });
    };
}
onReset();
//# sourceMappingURL=AztecTiles.js.map