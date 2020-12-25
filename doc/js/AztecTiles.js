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
    function makeKey(row, column) {
        return row + ":" + column;
    }
    var possiblePositions = new Map();
    function savePossiblePosition(row, column) {
        possiblePositions.set(makeKey(row, column), { row: row, column: column });
    }
    var newPositions = new Map();
    var toDelete = new Set();
    var tiles = document.querySelectorAll(".tile[data-direction]");
    tiles.forEach(function (element) {
        var _a;
        if (element instanceof HTMLDivElement) {
            var row = +element.style.getPropertyValue("--row");
            var column = +element.style.getPropertyValue("--column");
            savePossiblePosition(row, column);
            var secondKey = void 0;
            switch (element.dataset.direction) {
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
            var conflict = newPositions.get(firstKey);
            if ((conflict === null || conflict === void 0 ? void 0 : conflict.element) !== ((_a = newPositions.get(secondKey)) === null || _a === void 0 ? void 0 : _a.element)) {
                // TODO We are failing here a lot.
                // Our logic is wrong.  We are checking for two blocks landing on top of one another.
                // We should be looking for two adjacent blocks trying to swap with each other!
                throw new Error("wtf");
            }
            if (conflict) {
                toDelete.add(conflict.element);
                toDelete.add(element);
                newPositions.delete(firstKey);
                newPositions.delete(secondKey);
            }
            else {
                newPositions.set(firstKey, { element: element, row: row, column: column });
                newPositions.set(secondKey, { element: element, row: row, column: column });
            }
        }
    });
    toDelete.forEach(function (element) {
        // TODO add animation.
        element.remove();
    });
    newPositions.forEach(function (item) {
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
                    blankAdded.add(makeKey(r, c));
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
function onForward() {
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
onReset();
//# sourceMappingURL=AztecTiles.js.map