const wheelRadius = 10;
const wheelWidth = 5;
const wheelInnerRadius = 9;
const layerThickness = 0.3;
const axleThickness = 0.2; //Currently arbitrary; measurement necessary
const pose = false;

function main(params) {
	function Annulus(r1, r2, h) {
		return difference(cylinder({r: r1, h: h, center: true}), cylinder({r: r2, h: h, center: true}));
	}
	function hexagonalPrism(radius, height) {
		var hexagon = [];
		for (var i = 0; i < 6; ++i) {
			var theta = Math.PI / 3 * i;
			hexagon.push([Math.cos(theta) * radius, Math.sin(theta) * radius]);
		}
		hexagon = new CSG.Path2D(hexagon, true).innerToCAG();
		return linear_extrude({height: height, center: true}, hexagon);
	}

	//Setup
	var layers = wheelWidth / layerThickness;

	var world = [];
	world.push(cylinder({r: wheelRadius, h: layerThickness, center: true})
	.subtract(hexagonalPrism(axleThickness, layerThickness)));
	for (var i = 0; i < layers - 1; i++) {
		world.push(Annulus(wheelRadius, wheelInnerRadius, layerThickness).translate([0, 0, i * layerThickness]));
	}

	if (pose) {
		world = cutObj(wheelWidth, layerThickness, union(world), wheelRadius);
	}
	function cutObj(objectHeight, layerThickness, csg, objectWidth) {
		const plane = CSG.Plane.fromPoints([0, 0, 0], [1, 0, 0], [0, 1, 0]);
		var layerArray = [];
		for(var i = 0; i < objectHeight / layerThickness / 2; i += layerThickness) {
    		layerArray.push(csg.translate([0, 0, -i]));
  		}
  		layerArray.forEach(function(item, index) {
			layerArray[index] = item.cutByPlane(plane.flipped()).cutByPlane(plane.translate([0, 0, 0.001]))
			.translate([0, index * objectWidth * 2.1, 0])
			.projectToOrthoNormalBasis(CSG.OrthoNormalBasis.Z0Plane());
		});
		return union(layerArray).translate([0, -union(layerArray).getBounds()[1].y / 2, 0]);
	}

	return world;
}