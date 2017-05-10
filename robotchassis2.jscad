const piWidth = 85;
const piLength = 56;
const piScrewPortPositions = [
	[15.5, -24.5],
	[15.5, 24.5],
	[81.5, -24.5],
	[81.5, 24.5]
];

const motorWidth = 70;
const motorLength = 60;
const motorHeight = 23;
const motorScrewPortPositions = [
	[0, 30],
	[0, -30]
];

const bWidth = 107.95;
const bLength = 63.5;
const bHeight = 12.7;
const batteryScrewPositions = [
	[0, 34.25],
	[0, -34.25],
	[56.475, 0]
];

function main() {
	function captureHexNut(hexRadius, hexHeight, screwWidth, cylHeight, cylWidth) {
		const base = cylinder({r: cylWidth / 2, h: cylHeight, center: [true, true, false]});
		var hexagon = [];
		for (var i = 0; i < 6; ++i) {
			var theta = Math.PI / 3 * i;
			hexagon.push([Math.cos(theta) * hexRadius, Math.sin(theta) * hexRadius]);
		}
		hexagon = new CSG.Path2D(hexagon, true).innerToCAG();
		const hexagonalPrism = linear_extrude({height: hexHeight}, hexagon);
		const screwHole = cylinder({r: screwWidth / 2, h: cylHeight, center: [true, true, false]});
		return difference(base, hexagonalPrism, screwHole);
	}
	function screwCylinder(screwWidth, cylHeight, cylWidth) {
		const base = cylinder({r: cylWidth / 2, h: cylHeight, center: [true, true, false]});
		const screwHole = cylinder({r: screwWidth / 2, h: cylHeight, center: [true, true, false]});
		return difference(base, screwHole);
	}

	function placeInPiScrewPorts(csg) {
		var endCAGs = [null, null, null, null];
		endCAGs.forEach(function(item, index) {
			endCAGs[index] = csg.translate([piScrewPortPositions[index][0], piScrewPortPositions[index][1], 0]);
		});
		return endCAGs;
	}
	function placeInMotorScrewPorts(csg) {
		var endCAGs = [null, null];
		endCAGs.forEach(function(item, index) {
			endCAGs[index] = csg.translate([motorScrewPortPositions[index][0], motorScrewPortPositions[index][1], 0]);
		});
		return endCAGs;
	}
	function placeInBatteryScrewPositions(csg) {
		var endCAGs = [null, null, null];
		endCAGs.forEach(function(item, index) {
			endCAGs[index] = csg.translate([batteryScrewPositions[index][0], batteryScrewPositions[index][1], 0]);
		});
		return endCAGs;
	}

	function strip(start, end, subtractWidth1, subtractWidth2) {
		const width = 10;
		const height = 5;
		const circle1 = circle({r: width / 2, center: true}).translate(start);
		const circle2 = circle({r: width / 2, center: true}).translate(end);
		const hull = chain_hull(circle1, circle2)
		.subtract(circle({r: subtractWidth1 / 2, center: true}).translate(start))
		.subtract(circle({r: subtractWidth2 / 2, center: true}).translate(end));
		return linear_extrude({height: height}, hull);
	}


	//#8-32 screws
	const batteryMount = screwCylinder(5, 5, 5).setColor(0, 1, 0);
	const batteryMounts = placeInBatteryScrewPositions(batteryMount);
	const batteryConnection1 = strip(batteryScrewPositions[0], batteryScrewPositions[1], 5, 5).setColor(0, 1, 0);
	const batteryConnection2 = strip([0, 0], batteryScrewPositions[2], 5, 5).setColor(0, 1, 0);
	const batteryMountPiece = union(batteryConnection1, batteryConnection2, batteryMounts);

	//M2.5 screws
	const piHexMount = captureHexNut(3, 2.1, 3.5, 10, 8).setColor(1, 0, 0);
	const piHexMounts = placeInPiScrewPorts(piHexMount);
	const piMountConnection1 = strip(piScrewPortPositions[0], piScrewPortPositions[3], 8, 8).setColor(1, 0, 0);
	const piMountConnection2 = strip(piScrewPortPositions[1], piScrewPortPositions[2], 8, 8).setColor(1, 0, 0);
	const piSideMount = union(
		batteryMountPiece.translate([50, 0, 0]),
		piMountConnection1,
		piMountConnection2,
		piHexMounts
	);

	//M3 screws
	//Hex: 3.1 to a side
	const aaScrewMount = captureHexNut(3, 2.1, 4, 10, 8).setColor(1, 1, 0);

	const motorHexMount = captureHexNut(3, 2.1, 4, 10, 8).setColor(0, 0, 1);
	const motorHexMounts = placeInMotorScrewPorts(motorHexMount);
	const motorConnection1 = strip(motorScrewPortPositions[0], motorScrewPortPositions[1], 8, 8).setColor(0, 0, 1);
	const motorMount = union(motorConnection1, motorHexMounts);
	const motorConnection2 = strip([motorScrewPortPositions[0][1], [0, 0]], [0, 0], 8, 0.001).setColor(0, 0, 1);
	const motorSideMount = union(
		aaScrewMount.translate([70, 0, 0]),
		batteryMountPiece.translate([30, 0, 0])
		.subtract(cylinder({r: 4, h: 5, center: [true, true, false]}).translate([70, 0, 0])),
		motorConnection2,
		motorMount
	);
	//return piSideMount; //Testing
	return union(piSideMount, motorSideMount.translate([-100, 0, 0]));
}