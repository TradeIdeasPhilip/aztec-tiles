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
var allPanelInfo = {
    new: { direction: "new", dLeft: 0, dTop: 0, div: undefined, height: 2, width: 2, get compareBefore() { throw new Error("wtf"); }, get orientation() { throw new Error("wtf"); } },
    top: { direction: "top", dLeft: 0, dTop: -1, div: undefined, opposite: "bottom", height: 1, width: 2, compareBefore: true, orientation: "horizontal" },
    bottom: { direction: "bottom", dLeft: 0, dTop: 1, div: undefined, opposite: "top", height: 1, width: 2, compareBefore: false, orientation: "horizontal" },
    left: { direction: "left", dLeft: -1, dTop: 0, div: undefined, opposite: "right", height: 2, width: 1, compareBefore: true, orientation: "vertical" },
    right: { direction: "right", dLeft: 1, dTop: 0, div: undefined, opposite: "left", height: 2, width: 1, compareBefore: false, orientation: "vertical" },
};
var directions = Object.keys(allPanelInfo);
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
        var info = allPanelInfo[direction];
        div.style.setProperty("--dtop", info.dTop.toString());
        div.style.setProperty("--dleft", info.dLeft.toString());
        info.div = div;
        mainDiv.appendChild(div);
    });
}
function disableTransitions() {
    mainDiv.classList.add("disable-transitions");
}
function enableTransitions() {
    mainDiv.classList.remove("disable-transitions");
}
var Tile = (function () {
    function Tile(panelInfo, row, column) {
        this.panelInfo = panelInfo;
        this.row = row;
        this.column = column;
        this.div = document.createElement("div");
        this.div.classList.add("tile");
        this.div.classList.add(panelInfo.direction);
        this.setDivPosition();
        panelInfo.div.appendChild(this.div);
        Tile.all.add(this);
    }
    Tile.create = function (direction, row, column) {
        return new Tile(allPanelInfo[direction], row, column);
    };
    Tile.prototype.setDivPosition = function () {
        var info = this.panelInfo;
        this.div.style.setProperty("--row", (this.row - generation * info.dTop).toString());
        this.div.style.setProperty("--column", (this.column - generation * info.dLeft).toString());
    };
    Tile.prototype.addOffset = function (offset) {
        this.row += offset;
        this.column += offset;
        this.keysCache = undefined;
        this.setDivPosition();
    };
    Tile.prototype.remove = function () {
        Tile.all.delete(this);
        this.div.remove();
    };
    Tile.prototype.fadeOut = function () {
        var _this = this;
        Tile.all.delete(this);
        this.div.classList.add("fade-out");
        setTimeout(function () {
            _this.div.remove();
        }, 2000);
    };
    Tile.prototype.getRow = function () { return this.row; };
    Tile.prototype.getColumn = function () { return this.column; };
    Tile.makeKey = function (row, column) {
        return row + ":" + column;
    };
    Object.defineProperty(Tile.prototype, "keys", {
        get: function () {
            if (!this.keysCache) {
                var info = this.panelInfo;
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
        var info = this.panelInfo;
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
        var orientation = tile.panelInfo.orientation;
        var other = crossingPositions[orientation].get(key);
        if (other) {
            tile.fadeOut();
            other.fadeOut();
            return true;
        }
        crossingPositions[orientation].set(key, tile);
        return false;
    }
    Tile.all.forEach(function (tile) {
        var compareBefore = tile.panelInfo.compareBefore;
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
            Tile.create("new", row, column);
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
        if (tile.panelInfo.direction == "new") {
            var row = tile.getRow();
            var column = tile.getColumn();
            tile.remove();
            if (Math.random() < 0.5) {
                Tile.create("top", row, column);
                Tile.create("bottom", row + 1, column);
            }
            else {
                Tile.create("left", row, column);
                Tile.create("right", row, column + 1);
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
        enableTransitions();
        autoResize();
    }
    else if (document.querySelector(".new")) {
        disableTransitions();
        randomlyFill();
    }
    else {
        enableTransitions();
        moveTilesOnce();
    }
}
function saveState() {
    var savedCellCount = cellCount;
    var savedGeneration = generation;
    var tiles = Array.from(Tile.all).map(function (tile) { return ({ panelInfo: tile.panelInfo, row: tile.getRow(), column: tile.getColumn() }); });
    return function () {
        clearAll();
        setCellCount(savedCellCount);
        setGeneration(savedGeneration);
        tiles.forEach(function (tile) { return new Tile(tile.panelInfo, tile.row, tile.column); });
    };
}
function onUndo() {
    popUndoItem();
}
onReset();
//# sourceMappingURL=AztecTiles.js.map