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
		MAP_TILES = {};
		_.times(NUM_OF_TILES, (y) => {
			_.times(NUM_OF_TILES, (x) => {
				MAP_TILES[xy2pos(x, y)] = 0;
			});
		});

		_.times(NUM_OF_TILES * 0.3, () => {
			var lineLength = _.random(3, NUM_OF_TILES / 4);
			var sx = _.random(0, NUM_OF_TILES - 1);
			var sy = _.random(0, NUM_OF_TILES - 1);
			if (Math.random() < 0.5) {
				_.times(lineLength, (i) => MAP_TILES[xy2pos(sx + i, sy)] = Infinity);
			} else {
				_.times(lineLength, (i) => MAP_TILES[xy2pos(sx, sy + i)] = Infinity);
			}
		});

		_.times(NUM_OF_TILES * 0.5, () => {
			var r = Math.round(_.random(3, NUM_OF_TILES / 5));
			var cx = _.random(0, NUM_OF_TILES - 1);
			var cy = _.random(0, NUM_OF_TILES - 1);
			for (var y = -r; y <= r; y++) {
				for (var x = -r; x <= r; x++) {
					var r2 = Math.sqrt(x * x + y * y);
					if (r2 <= r) {
						MAP_TILES[xy2pos(cx + x, cy + y)] += (r - r2) / r;
					}
				}
			}
		});

		var rnd = () => _.random(0, NUM_OF_TILES - 1);
		MAP_TILES[xy2pos(rnd(), rnd())] = 'S';
		MAP_TILES[xy2pos(rnd(), rnd())] = 'G';
	}

	function renderMap(status) {
		var canvas = document.getElementById('canvas');
		var ctx = canvas.getContext('2d');
		var size = Math.min(canvas.width, canvas.height) / NUM_OF_TILES;

		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Render tiles
		_.each(MAP_TILES, (tile, pos) => {
			if (tile === 0) return;
			else if (tile === Infinity) ctx.fillStyle = '#666';
			else if (_.isFinite(tile)) ctx.fillStyle = 'hsl(0, 0%, ' + (70 + 30 * (1 - tile)) + '%)';
			else return;
			var xy = pos2xy(pos);
			ctx.fillRect(xy[0] * size, xy[1] * size, size, size);
		});

		// Render cost map
		var maxCost = _.max(_.values(status.cost));
		if (0 < maxCost) {
			_.each(status.cost, (cost, pos) => {
				var hue = Math.min((1 - cost / maxCost) * 240, 240);
				ctx.fillStyle = 'hsl(' + hue + ', 100%, 75%)';
				var xy = pos2xy(pos);
				ctx.fillRect(xy[0] * size, xy[1] * size, size, size);
			});
		}

		// Render found path if exists
		ctx.strokeStyle = '#f00';
		ctx.lineWidth = 4;
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
		ctx.strokeStyle = 'rgba(0,0,0,0.4)';
		ctx.lineWidth = 2;
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
			ctx.strokeText(text, 0, 0, size);
			ctx.restore();
		});
	}

	// Returns distance between points
	function distance(pos1, pos2) {
		var xy1 = pos2xy(pos1);
		var xy2 = pos2xy(pos2);
		var dx = xy2[0] - xy1[0];
		var dy = xy2[1] - xy1[1];
		return Math.sqrt(dx * dx + dy * dy);
	}

	// Returns cost of tile
	function tileCost(pos) {
		var tile = MAP_TILES[pos];
		if ('S' === tile || 'G' === tile) return 0;
		return MAP_TILES[pos] * 3;
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
		return status;
	}

	// Step A*
	function step(status) {
		// Select the minimum cost tile by expected-cost.
		var minCostPos = _.minBy(_.keys(status.open), (pos) => {
			return status.cost[pos] + distance(pos, status.goal);
		});

		// Open around tiles
		var xy = pos2xy(minCostPos);
		[
			[1, 0], [-1, 0], [0, 1], [0, -1],
			[1, 1], [1, -1], [-1, 1], [-1, -1],
		].forEach((offset) => {
			var nextPos = xy2pos(xy[0] + offset[0], xy[1] + offset[1]);
			if (nextPos === status.start) return;
			if (_.isUndefined(MAP_TILES[nextPos])) return;	// no tile
			var newCost = status.cost[minCostPos] +
										distance(minCostPos, nextPos) +
										tileCost(nextPos);
			if (!_.isFinite(newCost)) return;	// disabled tile
			if (!status.cost[nextPos] || newCost < status.cost[nextPos]) {
				status.open[nextPos] = true;
				status.cost[nextPos] = newCost;
				status.direction[nextPos] = xy2pos(offset[0], offset[1]);
			}
		});

		// Close the minimum cost tile
		delete status.open[minCostPos];

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
		console.time('A*');
		var st = init();
		while(true) {
			step(st);
			if (st.path) {
				$message.textContent = 'Goal!';
				break;
			}
			if (!st.path && _.size(st.open) === 0) {
				$message.textContent = 'No path!';
				break;
			}
		}
		console.timeEnd('A*');
		renderMap(st);
		// clearInterval(intervalId);
		// intervalId = setInterval(function() {
			// renderMap(step(st));
			// if (st.path) {
				// clearInterval(intervalId);
				// $message.textContent = 'Goal!';
			// }
			// if (!st.path && _.size(st.open) === 0) {
				// clearInterval(intervalId);
				// $message.textContent = 'No path!';
			// }
		// }, 10);
	});

	createMap();
	renderMap(init());
})();
