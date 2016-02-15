(function() {
	'use strict';

	var MAP_TILES = {};
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
		_.times(20, (y) => {
			_.times(20, (x) => {
				var tile = (Math.random() < 0.4) ? '#' : ' ';
				MAP_TILES[x + '_' + y] = tile;
			});
		});
		MAP_TILES['0_0'] = 'S';
		MAP_TILES['19_19'] = 'G';
		//*/
	}

	function renderMap(status) {
		var ctx = document.getElementById('canvas').getContext('2d');
		ctx.clearRect(0, 0, 500, 500);
		var mapTileSize = 20;

		// Fill walls
		ctx.fillStyle = '#fa4';	// wall
		ctx.strokeStyle = '#000';
		ctx.lineWidth = 0.5;
		_.each(MAP_TILES, (tile, pos) => {
			if (tile !== '#') return;
			var xy = pos.split('_').map((n) => parseInt(n, 10));
			var x = xy[0] * mapTileSize;
			var y = xy[1] * mapTileSize;
			ctx.fillRect(x, y, mapTileSize, mapTileSize);
			ctx.strokeRect(x, y, mapTileSize, mapTileSize);
		});

		// Draw start & goal tile
		ctx.font = (mapTileSize * 1.2) + "px 'Tahoma";
		ctx.fillStyle = '#00f';
		[status.start, status.goal].forEach((pos) => {
			var xy = pos.split('_').map((n) => parseInt(n, 10));
			var x = xy[0] * mapTileSize;
			var y = xy[1] * mapTileSize;
			ctx.fillText(MAP_TILES[pos], x, y + mapTileSize, mapTileSize);
		});

		// Fill open & closed tiles
		ctx.fillStyle = 'rgba(255,0,0,0.5)';	// open
		_.keys(status.open).forEach((pos) => {
			var xy = pos.split('_').map((n) => parseInt(n, 10));
			var x = xy[0] * mapTileSize;
			var y = xy[1] * mapTileSize;
			ctx.fillRect(x, y, mapTileSize, mapTileSize);
		});
		ctx.fillStyle = 'rgba(0,0,0,0.3)';	// closed
		_.keys(status.closed).forEach((pos) => {
			var xy = pos.split('_').map((n) => parseInt(n, 10));
			var x = xy[0] * mapTileSize;
			var y = xy[1] * mapTileSize;
			ctx.fillRect(x, y, mapTileSize, mapTileSize);
		});

		// Draw path
		ctx.strokeStyle = '#ff0';
		ctx.lineWidth = 4;
		ctx.beginPath();
		_.each(status.path, (pos, index) => {
			var xy = pos.split('_').map((n) => parseInt(n, 10));
			var x = (xy[0] + 0.5) * mapTileSize;
			var y = (xy[1] + 0.5) * mapTileSize;
			if (0 === index) {
				ctx.moveTo(x, y);
			} else {
				ctx.lineTo(x, y);
			}
		});
		ctx.stroke();

		// Draw direction
		ctx.font = (mapTileSize * 0.8) + "px 'ＭＳ 明朝";
		ctx.fillStyle = '#f00';
		_.each(status.direction, (direction, pos) => {
			if (!direction) return;
			var xy = pos.split('_').map((n) => parseInt(n, 10));
			var x = xy[0] * mapTileSize;
			var y = xy[1] * mapTileSize;
			var text = '';
			ctx.save();
			ctx.translate(x, y + mapTileSize);
			if (direction === '1_0') text = '←';
			if (direction === '-1_0') text = '→';
			if (direction === '0_1') text = '↑';
			if (direction === '0_-1') text = '↓';
			if (text) {
				ctx.translate(mapTileSize * 0.15, -mapTileSize * 0.2);
			} else {
				ctx.translate(0, -mapTileSize * 0.5);
				ctx.rotate(45 * Math.PI / 180);
				if (direction === '1_1') text = '←';
				if (direction === '-1_-1') text = '→';
				if (direction === '-1_1') text = '↑';
				if (direction === '1_-1') text = '↓';
			}
			ctx.fillText(text, 0, 0, mapTileSize);
			ctx.restore();
		});
	}

	// Returns cost between points
	function cost(a, b) {
		var xy1 = a.split('_').map((n) => parseInt(n, 10));
		var xy2 = b.split('_').map((n) => parseInt(n, 10));
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
		var xy = minCostPos.split('_').map((n) => parseInt(n, 10));
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
			var nextPos = (xy[0] + offset[0]) + '_' + (xy[1] + offset[1]);
			var dir = offset[0] + '_' + offset[1];
			if (!MAP_TILES[nextPos]) return;
			if (MAP_TILES[nextPos] === '#') return;
			if (status.closed[nextPos] && !status.open[nextPos]) return;
			status.open[nextPos] = true;

			var actualCost = cost('0_0', dir);
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
			// Close all
			status.closed = _.merge(status.closed, status.open);
			status.open = {};

			// Create path
			status.path = [status.goal];
			var pos = status.goal;
			while(pos !== status.start) {
				var dir = status.direction[pos];
				var xy1 = pos.split('_').map((n) => parseInt(n, 10));
				var xy2 = dir.split('_').map((n) => parseInt(n, 10));
				var x = xy1[0] - xy2[0];
				var y = xy1[1] - xy2[1];
				var nextPos = x + '_' + y;
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
		}, 50);
	});

	createMap();
	renderMap(init());
})();
