(function() {
	'use strict';

	var NUM_OF_TILES = 30;
	var MAP_TILES = {};

	function pos2xy(pos) {
		return pos.split('_').map((n) => parseInt(n, 10));
	}
	function xy2pos(x, y) {
		return x + '_' + y;
	}

	function createMap() {
		/*
		MAP_TILES = [
			'##########',
			'#        #',
			'# #### # #',
			'#  S#### #',
			'#####  # #',
			'#        #',
			'#  #######',
			'# ###    #',
			'#     #G #',
			'##########',
		].map((a) => a.split('')).reduce((result, yTiles, y) => {
			yTiles.forEach((tile, x) => {
				result[x + '_' + y] = tile;
			});
			return result;
		}, {});
		/*/
		MAP_TILES = {};
		_.times(NUM_OF_TILES, (y) => {
			_.times(NUM_OF_TILES, (x) => {
				var tile = (Math.random() < 0.5) ? '#' : ' ';
				MAP_TILES[x + '_' + y] = tile;
			});
		});
		var r = () => _.random(0,NUM_OF_TILES - 1);
		MAP_TILES[xy2pos(r(), r())] = 'S';
		MAP_TILES[xy2pos(r(), r())] = 'G';
		//*/
	}

	function renderMap(status) {
		var canvas = document.getElementById('canvas');
		var ctx = canvas.getContext('2d');
		var size = Math.min(canvas.width, canvas.height) / NUM_OF_TILES;

		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Render walls
		ctx.fillStyle = '#888';
		ctx.strokeStyle = '#000';
		ctx.lineWidth = 0.5;
		_.each(MAP_TILES, (tile, pos) => {
			if (tile !== '#') return;
			var xy = pos2xy(pos);
			ctx.fillRect(xy[0] * size, xy[1] * size, size, size);
			ctx.strokeRect(xy[0] * size, xy[1] * size, size, size);
		});

		// Render open & closed tiles
		ctx.fillStyle = 'rgba(255,255,0,0.5)';	// open
		_.keys(status.open).forEach((pos) => {
			var xy = pos2xy(pos);
			ctx.fillRect(xy[0] * size, xy[1] * size, size, size);
		});
		ctx.fillStyle = 'rgba(0,0,0,0.3)';	// closed
		_.keys(status.closed).forEach((pos) => {
			var xy = pos2xy(pos);
			ctx.fillRect(xy[0] * size, xy[1] * size, size, size);
		});

		// Render found path if exists
		ctx.strokeStyle = '#0f0';
		ctx.lineWidth = 8;
		ctx.beginPath();
		_.each(status.path, (pos, index) => {
			var xy = pos2xy(pos);
			var x = (xy[0] + 0.5) * size;
			var y = (xy[1] + 0.5) * size;
			if (0 === index) {
				ctx.moveTo(x, y);
			} else {
				ctx.lineTo(x, y);
			}
		});
		ctx.stroke();

		// Render start & goal tile
		ctx.font = (size * 1.2) + "px 'Tahoma";
		ctx.fillStyle = '#00f';
		[status.start, status.goal].forEach((pos) => {
			var xy = pos2xy(pos);
			ctx.fillText(MAP_TILES[pos], xy[0] * size, (xy[1] + 1) * size, size);
		});

		// Render direction
		ctx.font = (size * 0.8) + "px 'ＭＳ 明朝";
		ctx.fillStyle = '#f00';
		_.each(status.direction, (direction, pos) => {
			if (!direction) return;
			var xy = pos2xy(pos);
			var text = '';
			ctx.save();
			ctx.translate(xy[0] * size, (xy[1] + 1) * size);
			if (direction === '1_0') text = '←';
			if (direction === '-1_0') text = '→';
			if (direction === '0_1') text = '↑';
			if (direction === '0_-1') text = '↓';
			if (text) {
				ctx.translate(size * 0.15, -size * 0.2);
			} else {
				ctx.translate(0, -size * 0.5);
				ctx.rotate(45 * Math.PI / 180);
				if (direction === '1_1') text = '←';
				if (direction === '-1_-1') text = '→';
				if (direction === '-1_1') text = '↑';
				if (direction === '1_-1') text = '↓';
			}
			ctx.fillText(text, 0, 0, size);
			ctx.restore();
		});
	}

	// Returns cost between points
	function cost(pos1, pos2) {
		var xy1 = pos2xy(pos1);
		var xy2 = pos2xy(pos2);
		var dx = xy2[0] - xy1[0];
		var dy = xy2[1] - xy1[1];
		return Math.sqrt(dx * dx + dy * dy);
	}

	// Initialize A*
	function init() {
		var status = {};
		_.each(MAP_TILES, (tile, pos) => {
			if (tile === 'S') status.start = pos;
			if (tile === 'G') status.goal = pos;
		});
		status.cost = {[status.start]: 0};
		status.direction = {[status.start]: null};
		status.open = {[status.start]: true};
		status.closed = {};
		return status;
	}

	// Step A*
	function step(status) {
		// Select the minimum cost tile by expected-cost.
		var minCostPos = _.minBy(_.keys(status.open), (pos) => {
			return status.cost[pos] + cost(pos, status.goal);
		});

		// Check around tiles
		var xy = pos2xy(minCostPos);
		[
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1],

			[1, 1],
			[1, -1],
			[-1, 1],
			[-1, -1],
		].forEach((offset) => {
			var nextPos = xy2pos(xy[0] + offset[0], xy[1] + offset[1]);
			var dir = xy2pos(offset[0], offset[1]);
			if (!MAP_TILES[nextPos]) return;
			if (MAP_TILES[nextPos] === '#') return;
			if (status.closed[nextPos] && !status.open[nextPos]) return;
			status.open[nextPos] = true;

			var actualCost = cost(xy2pos(0, 0), dir);
			var newCost = status.cost[minCostPos] + actualCost;
			if (!status.cost[nextPos] || newCost < status.cost[nextPos]) {
				status.cost[nextPos] = newCost;
				status.direction[nextPos] = dir;
			}
		});
		delete status.open[minCostPos];
		status.closed[minCostPos] = true;

		// Check if goal
		if (status.direction[status.goal]) {
			// Create path
			status.path = [status.goal];
			var pos = status.goal;
			while(pos !== status.start) {
				var dir = status.direction[pos];
				var p = pos2xy(pos);
				var d = pos2xy(dir);
				var nextPos = xy2pos(p[0] - d[0], p[1] - d[1]);
				status.path.push(nextPos);
				pos = nextPos;
			}
			status.path.reverse();
		}

		return status;
	}


	var $message = document.getElementById('message');
	var intervalId = null;
	document.getElementById('createMap').addEventListener('click', function() {
		clearInterval(intervalId);
		createMap();
		renderMap(init());
		$message.textContent = '';
	});
	document.getElementById('step').addEventListener('click', function() {
		var st = init();
		renderMap(st);
		clearInterval(intervalId);
		intervalId = setInterval(function() {
			renderMap(step(st));
			if (st.path) {
				clearInterval(intervalId);
				$message.textContent = 'Goal!';
			}
			if (!st.path && _.size(st.open) === 0) {
				clearInterval(intervalId);
				$message.textContent = 'No path!';
			}
		}, 10);
	});

	createMap();
	renderMap(init());
})();
