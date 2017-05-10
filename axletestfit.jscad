// Params:
// - path: CSG.Path2D instance to bound the piece.
// - slots: optional array of 7-tuples, each of which is [length, rX,
//   rY, rZ, x, y, z] describing a slot cut out of the piece, with the
//   given length, rotated by [rX,rY,rZ] and then translated by
//   [x,y,z].
const THICKNESS = 3;
const stepSize = 0.05;
const minSize = 1.2;
const maxSize = 1.7;
const numberOfHoles = (maxSize - minSize) / stepSize + 1;
function getParameterDefinitions() {
	return [{name: 'mode', type: 'choice', values: ["3D", "2D"], captions: ['3D', '2D'], caption: 'Mode'}];
}
function main(params) {
	const mode2D = params.mode == "2D";
	function hexagon(radius) {
		var hexagon = [];
		for (var i = 0; i < 6; ++i) {
			var theta = Math.PI / 3 * i;
			hexagon.push([Math.cos(theta) * radius, Math.sin(theta) * radius]);
		}
		return new CSG.Path2D(hexagon, true).innerToCAG();
	}

	var hexes = [];
	for (var i = 0; i < numberOfHoles; ++i) {
		hexes.push(piece({path: hexagon(minSize + (i * stepSize))}).translate([maxSize * i * 2.5, 0, 0]));
	}

	const world = [difference(
		piece({path: square({size: [numberOfHoles * maxSize * 2.5, maxSize + 5]})}).translate([-maxSize, -(maxSize + 5) / 2]),
		union(hexes)
	)];

	return layoutForPrint(mode2D, world);
}

/* To use this:
- use piece() to generate pieces and add them to an array after rotate()/translate()/etc them
- use layoutForPrint() to generate a print.
*/
	
die = function(msg) {throw "error: " + msg;}

text = function(str) {
	var l = vector_text(0,0,str);   // l contains a list of polylines to be drawn
	var o = [];
	l.forEach(function(pl) { // pl = polyline (not closed)
		o.push(rectangular_extrude(pl, {w: 2, h: 2}));
	});
	var s = union(o).scale(0.5);
	var boundsMin = s.getBounds()[0];
	var atOrigin = s.translate([-boundsMin.x, -boundsMin.y, -boundsMin.z]);
	var boundsMax = s.getBounds()[1];
	return s.translate([-boundsMax.x, -boundsMax.y/2, 0]);
}

axes = function() {
	function arrow(name) {
		var length = 10;
		var epsilon = length / 100;
		return union(
			cylinder({r1: length/10, r2: 0, h: length}).rotateY(90),
			text(name)
		).setColor([255, 0, 0]);
	}
	var offset = 90;
	return union(
		arrow("x").translate([offset, 0, 0])
		,arrow("y").rotateZ(90).translate([0, offset, 0])
		,arrow("z").rotateY(-90).translate([0, 0, offset])
	);
}

// Delegate to CAG.roundedRectangle() but also:
// - fill in corners noted in params.squareCorners, specified as an
//   array of ints in 0..3, where 0 is lower-left and index increases
//   clockwise.
// - create fillets on the outside of outerFilletCorners (same corner
//   spec as above), where each fillet is 4 complements of
//   quarter-discs.
// These two enhancements make it easier to build up shapes from
// touching roundedRectangles without holes (squareCorners) and making
// interior joints smooth instead of sharp (outerFilletCorners).
roundedRectangle = function(params) {
	var rect = CAG.roundedRectangle(params);
	var bounds = rect.getBounds();
	var center = [(bounds[0].x + bounds[1].x)/2, (bounds[0].y + bounds[1].y)/2];
	// Corner i is given by [bounds[t].x, bounds[s].y] where [t,s] is
	// the i'th entry in this array.
	var cornersByIndex = [
		[0, 0],
		[1, 0],
		[1, 1],
		[0, 1]
	];
	for (var c in params.squareCorners) {
		var cornerBoundsIndexes = cornersByIndex[params.squareCorners[c]];
		var corner = [bounds[cornerBoundsIndexes[0]].x, bounds[cornerBoundsIndexes[1]].y];
		rect = union(rect, CAG.rectangle({corner1: corner, corner2: center}));
	}
	for (var c in params.outerFilletCorners) {
		var cornerBoundsIndexes = cornersByIndex[params.outerFilletCorners[c]];
		var corner = [bounds[cornerBoundsIndexes[0]].x, bounds[cornerBoundsIndexes[1]].y];
		rect = union(rect, filletAt(corner, params.roundradius));
	}
	return rect;
}

// See description of outerFilletCorners above for what this is for.
filletAt = function(center, radius) {
	var c0 = [center[0] - radius, center[1] - radius];
	var c1 = [center[0] + radius, center[1] - radius];
	var c2 = [center[0] + radius, center[1] + radius];
	var c3 = [center[0] - radius, center[1] + radius];
	return CAG.rectangle({corner1: c0, corner2: c2}).subtract(
		union(
			CAG.circle({center: c0, radius: radius}),
			CAG.circle({center: c1, radius: radius}),
			CAG.circle({center: c2, radius: radius}),
			CAG.circle({center: c3, radius: radius})
		)
	);
}

var pageStartTime = Date.now();
var lastEventTime = pageStartTime;
stopwatch = function(msg) {
	var now = Date.now();
	var sincePageStart = now - pageStartTime;
	var sinceLastEvent = now - lastEventTime;
	//console.log(sincePageStart + "ms / " + sinceLastEvent + "ms: " + msg);
	lastEventTime = now;
}

// Params:
// - path: CSG.Path2D instance to bound the piece.
// - slots: optional array of 7-tuples, each of which is [length, rX,
//   rY, rZ, x, y, z] describing a slot cut out of the piece, with the
//   given length, rotated by [rX,rY,rZ] and then translated by
//   [x,y,z].
piece = function(params) {
	var path = params["path"] || die("Missing path");
	var slots = params["slots"] || [];
	
	var extrudePiecePreSlots = function(path) {
		return path.extrude({offset: [0,0,THICKNESS]});
	}
	
	// Returns a box suitable for subtraction from a "piece" to form a
	// slot into which another piece can fit.  The box has two dimensions
	// of size THICKNESS: one to allow the cross-piece to fit, while the
	// other accounts for the amount of material being subtracted.  The
	// third dimension is the length of the box, and is free.  Because of
	// this, we can actually build slot() out of extrudePiecePreSlots()!
	var makeSlot = function(length) {
		// "radius" here is according to the suggestion in
		// http://blog.ponoko.com/2010/06/17/how-to-make-snug-joints-in-acrylic/
		// (search for "a small radii").  Using /5 below keeps the
		// radius over 0.5mm even for THICKNESS of 2.6 (probably
		// lowest I'm likely to cut) so that's what I'm using for now.
		// Might re-eval if that leaves the remaining tip of the slot
		// too narrow (not sure why that would be a problem).
		var radius = THICKNESS / 5;
		return union(
			extrudePiecePreSlots(CAG.rectangle({corner1: [0,0], corner2: [length, THICKNESS]})),
			extrudePiecePreSlots(CAG.circle({radius: radius, center: [length, 0]})),
			extrudePiecePreSlots(CAG.circle({radius: radius, center: [length, THICKNESS]}))
		);
	}

	var p = extrudePiecePreSlots(path);
	var s = [];
	for (var i = 0; i < slots.length; ++i) {
		var slot = slots[i];
		if (slot.length != 7) {
			die("Each slot needs 7 elements; one was: " + JSON.stringify(slot));
		}
		s.push(makeSlot(slot[0])
			   .rotateX(slot[1]).rotateY(slot[2]).rotateZ(slot[3])
			   .translate([slot[4], slot[5], slot[6]])
			  );
	}
	if (s.length) {
		p = difference(p, union(s));
	}
	// Attach a connector to allow laying-flat in layoutForPrint()
	// without having to use (expensive) lieFlat().
	p.properties._originalZ = new CSG.Connector([0, 0, 0], [0, 0, 1], [1, 0, 0]);
	return p;
}

function isEmpty(obj) {
	var bounds = obj.getBounds();
	return bounds[0].x == bounds[1].x
		&& bounds[0].y == bounds[1].y
		&& bounds[0].z == bounds[1].z;
}

function getOverlapOrNull(obj1, obj2) {
	var overlap = obj1.intersect(obj2);
	if (isEmpty(overlap)) {
		return null;
	}
	return overlap;
}

function cumulativePairwiseOverlapOrNull(pieces) {
	var acc = [];
	for (var i = 0; i < pieces.length - 1; ++i) {
		for (var j = i + 1; j < pieces.length; ++j) {
			var overlap = pieces[i].intersect(pieces[j]);
			if (isEmpty(overlap)) {
				continue;
			}
			acc.push(overlap);
		}
	}
	return acc.length == 0 ? null : union(acc);
}

function assignWandH(p2D) {
	var packingEpsilon = 3;
	var bounds = p2D.getBounds();
	p2D.w = bounds[1].x - bounds[0].x + packingEpsilon;
	p2D.h = bounds[1].y - bounds[0].y + packingEpsilon;
}

// Helper to lay a piece flat on the X-Y plane.  Speed relies on the
// presence of an _originalZ connector in p.properties.
function layFlat(p) {
	currentZ = new CSG.Connector([0,0,0],[0,0,1],[1,0,0]);
	return p.connectTo(p.properties._originalZ, currentZ, false, 0);
}

layoutForPrint = function(print, pieces) {
	stopwatch("layoutForPrint begin");
	var overlap = cumulativePairwiseOverlapOrNull(pieces);
	if (overlap != null) {
		return [
			overlap.setColor([255, 0, 0, 1]),
			union(pieces).setColor([0, 0, 255, 0.3]),
			text("OVERLAP!").translate([0, 0, union(pieces).getBounds()[1].z]).setColor([255, 0, 0])
		];
	}
	stopwatch("layoutForPrint overlap detection done");
	if (!print) {
		var ret = pieces.concat(axes());
		stopwatch("layoutForPrint done");
		return pieces;
	}
	var u = [];
	var xTranslate = 0;
	var SPACER = 5;
	var z0basis = CSG.OrthoNormalBasis.Z0Plane();
	
	var pieces2D = [];
	for (var i = 0; i < pieces.length; ++i) {
		stopwatch("lieFlat start");
		var p2D = layFlat(pieces[i]);
		stopwatch("lieFlat done");
		p2D = p2D.projectToOrthoNormalBasis(z0basis);
		stopwatch("projectToOrthoNormalBasis done");
		var bounds = p2D.getBounds();
		assignWandH(p2D);
		if (p2D.w < p2D.h) {
			p2D = p2D.rotateZ(90);
			assignWandH(p2D);
		}
		pieces2D.push(p2D);
	}
	stopwatch("lieFlat+projectToOrthoNormalBasis done");
	binPack(pieces2D);
	stopwatch("binpack done");
	for (var i = 0; i < pieces2D.length; ++i) {
		var p2D = pieces2D[i];
		var b = p2D.getBounds();
		u.push(p2D.translate([p2D.fit.x - b[0].x, p2D.fit.y - b[0].y, 0]));
	}
	stopwatch("translate done");
	return union(u);
}

//Packer
function binPack(pieces2D) {
	var packer = new GrowingPacker();
	// https://github.com/jakesgordon/bin-packing/pull/3/commits/a9c72459a968f2be622917f0e05e3dfbeb919720
	pieces2D.sort(function(a,b) { return (max(b.w, b.h) - max(a.w, a.h)); });
	packer.fit(pieces2D);
	for (var i = 0; i < pieces2D.length; ++i) {
		var p2D = pieces2D[i];
		if (!p2D.fit) {
			die("Couldn't fit: " + JSON.stringify(p2D));
		}
	}
}

GrowingPacker = function() {};
GrowingPacker.prototype = {
	fit: function(blocks) {
		var n, node, block, len = blocks.length;
		var w = len > 0 ? blocks[0].w : 0;
		var h = len > 0 ? blocks[0].h : 0;
		this.root = { x: 0, y: 0, w: w, h: h };
		for (n = 0; n < len ; n++) {
			block = blocks[n];
			if (node = this.findNode(this.root, block.w, block.h))
				block.fit = this.splitNode(node, block.w, block.h);
			else { block.fit = this.growNode(block.w, block.h); }
		}
	},

	findNode: function(root, w, h) {
		if (root.used) { return this.findNode(root.right, w, h) || this.findNode(root.down, w, h); }
		else if ((w <= root.w) && (h <= root.h)) { return root; }
		else { return null; }
	},

	splitNode: function(node, w, h) {
		node.used = true;
		node.down  = { x: node.x,     y: node.y + h, w: node.w,     h: node.h - h };
		node.right = { x: node.x + w, y: node.y,     w: node.w - w, h: h          };
		return node;
	},

	growNode: function(w, h) {
		var canGrowDown  = (w <= this.root.w);
		var canGrowRight = (h <= this.root.h);

		var shouldGrowRight = canGrowRight && (this.root.h >= (this.root.w + w)); // attempt to keep square-ish by growing right when height is much greater than width
		var shouldGrowDown  = canGrowDown  && (this.root.w >= (this.root.h + h)); // attempt to keep square-ish by growing down  when width  is much greater than height

		if (shouldGrowRight)
			return this.growRight(w, h);
		else if (shouldGrowDown)
			return this.growDown(w, h);
		else if (canGrowRight)
			return this.growRight(w, h);
		else if (canGrowDown)
			return this.growDown(w, h);
		else
			return null; // need to ensure sensible root starting size to avoid this happening
	},

	growRight: function(w, h) {
		this.root = {
			used: true,
			x: 0,
			y: 0,
			w: this.root.w + w,
			h: this.root.h,
			down: this.root,
			right: { x: this.root.w, y: 0, w: w, h: this.root.h }
		};
		if (node = this.findNode(this.root, w, h))
			return this.splitNode(node, w, h);
		else
			return null;
	},

	growDown: function(w, h) {
		this.root = {
			used: true,
			x: 0,
			y: 0,
			w: this.root.w,
			h: this.root.h + h,
			down:  { x: 0, y: this.root.h, w: this.root.w, h: h },
			right: this.root
		};
		if (node = this.findNode(this.root, w, h))
			return this.splitNode(node, w, h);
		else { return null; }
  }
}
