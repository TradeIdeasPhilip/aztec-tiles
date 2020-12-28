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
function setCellCount(newValue) {
    if (!isFinite(newValue) || newValue < 1 || newValue != Math.floor(newValue)) {
        throw new RangeError("Expecting a positive number, got: " + newValue);
    }
    cellCount = newValue;
    mainDiv.style.setProperty("--cells", newValue.toString());
}
var panelInfo = {
    new: { dLeft: 0, dTop: 0, div: undefined, height: 2, width: 2, get compareBefore() { throw new Error("wtf"); }, get orientation() { throw new Error("wtf"); } },
    top: { dLeft: 0, dTop: -1, div: undefined, opposite: "bottom", height: 1, width: 2, compareBefore: true, orientation: "horizontal" },
    bottom: { dLeft: 0, dTop: 1, div: undefined, opposite: "top", height: 1, width: 2, compareBefore: false, orientation: "horizontal" },
    left: { dLeft: -1, dTop: 0, div: undefined, opposite: "right", height: 2, width: 1, compareBefore: true, orientation: "vertical" },
    right: { dLeft: 1, dTop: 0, div: undefined, opposite: "left", height: 2, width: 1, compareBefore: false, orientation: "vertical" },
};
var directions = Object.keys(panelInfo);
var generation = 0;
function setGeneration(newValue) {
    mainDiv.style.setProperty("--generation", newValue.toString());
    generation = newValue;
}
function clearAll() {
    mainDiv.innerText = "";
    Tile.all.clear();
    setGeneration(0);
    directions.forEach(function (direction) {
        var div = document.createElement("div");
        div.className = "animation-panel";
        var info = panelInfo[direction];
        div.style.setProperty("--dtop", info.dTop.toString());
        div.style.setProperty("--dleft", info.dLeft.toString());
        info.div = div;
        mainDiv.appendChild(div);
    });
}
var Tile = (function () {
    function Tile(direction, row, column) {
        this.direction = direction;
        this.row = row;
        this.column = column;
        this.div = document.createElement("div");
        this.div.classList.add("tile");
        this.div.classList.add(direction);
        this.setDivPosition();
        panelInfo[this.direction].div.appendChild(this.div);
        Tile.all.add(this);
    }
    Tile.prototype.setDivPosition = function () {
        var info = panelInfo[this.direction];
        this.div.style.setProperty("--row", (this.row - generation * info.dTop).toString());
        this.div.style.setProperty("--column", (this.column - generation * info.dLeft).toString());
    };
    Tile.prototype.addOffset = function (offset) {
        this.row += offset;
        this.column += offset;
        this.setDivPosition();
    };
    Tile.prototype.remove = function () {
        Tile.all.delete(this);
        this.div.remove();
    };
    Tile.prototype.getRow = function () { return this.row; };
    Tile.prototype.getColumn = function () { return this.column; };
    Tile.makeKey = function (row, column) {
        return row + ":" + column;
    };
    Object.defineProperty(Tile.prototype, "keys", {
        get: function () {
            if (!this.keysCache) {
                var info = panelInfo[this.direction];
                this.keysCache = [];
                for (var r = 0; r < info.height; r++) {
                    for (var c = 0; c < info.width; c++) {
                        this.keysCache.push(Tile.makeKey(this.row + r, this.column + c));
                    }
                }
            }
            return this.keysCache;
        },
        enumerable: false,
        configurable: true
    });
    Tile.prototype.moveOnce = function () {
        var info = panelInfo[this.direction];
        this.row += info.dTop;
        this.column += info.dLeft;
        this.keysCache = undefined;
    };
    Tile.all = new Set();
    return Tile;
}());
function moveTilesOnce() {
    setGeneration(generation + 1);
    var crossingPositions = { horizontal: new Map(), vertical: new Map() };
    function checkForCross(tile) {
        var key = tile.keys[0];
        var orientation = panelInfo[tile.direction].orientation;
        var other = crossingPositions[orientation].get(key);
        if (other) {
            tile.remove();
            other.remove();
            return true;
        }
        crossingPositions[orientation].set(key, tile);
        return false;
    }
    Tile.all.forEach(function (tile) {
        var compareBefore = panelInfo[tile.direction].compareBefore;
        if (compareBefore) {
            if (!checkForCross(tile)) {
                tile.moveOnce();
            }
        }
        else {
            tile.moveOnce();
            checkForCross(tile);
        }
    });
    var occupied = new Set();
    Tile.all.forEach(function (tile) {
        tile.keys.forEach(function (key) { return occupied.add(key); });
    });
    var offset = Math.floor(cellCount / 2) - generation;
    function tryNewTile(row, column) {
        var keys = [];
        [column, column + 1].forEach(function (c) {
            [row, row + 1].forEach(function (r) {
                keys.push(Tile.makeKey(r, c));
            });
        });
        var conflict = false;
        for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
            var key = keys_1[_i];
            if (occupied.has(key)) {
                conflict = true;
                break;
            }
        }
        if (!conflict) {
            new Tile("new", row, column);
            keys.forEach(function (key) { return occupied.add(key); });
        }
    }
    for (var r = 0; r < generation; r++) {
        var row = r + offset;
        var leftOffset = offset + generation - r - 1;
        var width = r * 2 + 1;
        for (var c = 0; c < width; c++) {
            var column = c + leftOffset;
            tryNewTile(row, column);
        }
    }
    for (var r = 1; r < generation; r++) {
        var row = offset + generation + r - 1;
        var leftOffset = offset + r;
        var width = (generation - r) * 2 - 1;
        for (var c = 0; c < width; c++) {
            var column = c + leftOffset;
            tryNewTile(row, column);
        }
    }
}
function randomlyFill() {
    Tile.all.forEach(function (tile) {
        if (tile.direction == "new") {
            var row = tile.getRow();
            var column = tile.getColumn();
            tile.remove();
            if (Math.random() < 0.5) {
                new Tile("top", row, column);
                new Tile("bottom", row + 1, column);
            }
            else {
                new Tile("left", row, column);
                new Tile("right", row, column + 1);
            }
        }
    });
}
function autoResize() {
    var offset = Math.floor(cellCount / 2);
    setCellCount(cellCount * 2);
    Tile.all.forEach(function (tile) { return tile.addOffset(offset); });
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
    if (generation * 2 >= cellCount) {
        autoResize();
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
    var savedGeneration = generation;
    var tiles = Array.from(Tile.all).map(function (tile) { return ({ direction: tile.direction, row: tile.getRow(), column: tile.getColumn() }); });
    return function () {
        clearAll();
        setCellCount(savedCellCount);
        setGeneration(savedGeneration);
        tiles.forEach(function (tile) { return new Tile(tile.direction, tile.row, tile.column); });
    };
}
function onUndo() {
    popUndoItem();
}
onReset();
//# sourceMappingURL=AztecTiles.js.map