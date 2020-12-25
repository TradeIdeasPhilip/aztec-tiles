"use strict";
function getById(id, ty) {
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
var mainDiv = getById("main", HTMLDivElement);
var cellCount = 6;
var needResizeSoon = false;
function setCellCount(newValue) {
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
function createTile(direction, row, column) {
    var tile = document.createElement("div");
    tile.classList.add("tile");
    tile.classList.add(direction);
    tile.dataset.direction = direction;
    tile.style.setProperty("--row", row.toString());
    tile.style.setProperty("--column", column.toString());
    mainDiv.appendChild(tile);
    return tile;
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
    var possiblePositions = new Map();
    function savePossiblePosition(row, column) {
        possiblePositions.set(makeKey(row, column), { row: row, column: column });
    }
    var originalPositions = new Map();
    var toDelete = new Set();
    var tiles = document.querySelectorAll(".tile");
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
    var newPositions = new Set();
    originalPositions.forEach(function (tile) {
        tile.keys.forEach(function (key) { return newPositions.add(key); });
    });
    toDelete.forEach(function (element) {
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
    Array.from(possiblePositions.values()).forEach(function (location) {
        var row = location.row, column = location.column;
        savePossiblePosition(row - 1, column);
        savePossiblePosition(row + 1, column);
        savePossiblePosition(row, column - 1);
        savePossiblePosition(row, column + 1);
    });
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
var undo = [];
var undoButton = getById("undo", HTMLButtonElement);
function pushUndoItem() {
    if (undo.length == 5) {
        undo.shift();
    }
    undo.push(saveState());
    undoButton.disabled = false;
}
function popUndoItem() {
    var toRestore = undo.pop();
    undoButton.disabled = undo.length == 0;
    if (!toRestore) {
        throw new Error("wtf");
    }
    toRestore();
}
function onForward() {
    pushUndoItem();
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
function onUndo() {
    popUndoItem();
}
onReset();
//# sourceMappingURL=AztecTiles.js.map