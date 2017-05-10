//All measurements in millimeters
//Can we use the same bolts with the gearbox and the pi?
//Reduce amount of material in chassis v
//Combine pi holder and battery holder |
//Use "t" shape with "ribbons"		   ^
//How is the axle going to be attached to the wheels?
const piWidth = 85;
const piLength = 56;
const piHoleWidthOffset = 15.5;
const screwHole = 2.75; //M2.5 mounts
const screwMountOffset = 3.5;
const holeWall = 2.5;
const thickness = 4.5;
const bLength = 107.95;
const bWidth = 63.5;
const bHeight = 12.7;
function main() {
	function annulus(r1, r2, h = "no") {
		return difference(circle({r: r1, center: true}), circle({r: r2, center: true}));
	}
	function battery() {
		return cube({size: [bLength, bWidth, bHeight], center: true});
	}
	function piHolder() {
		function placeScrewPorts(CSG) {
			const items = [[1, 1], [1, -1], [-1, -1], [-1, 1]];
			var   xShift = piWidth / 2 - screwMountOffset;
			const yShift = piLength / 2 - screwMountOffset;
			items.forEach(function(item, index) {
				if (item[0] == -1) xShift = piHoleWidthOffset;
				items[index] = CSG.translate([item[0] * xShift, item[1] * yShift, 0]);
			});
			return items;
		}
		const piHolderBase = cube({size: [piWidth + 5, piLength + 5, 5], center: true});
		const piHolderSupports = placeScrewPorts(cylinder({r: screwHole + holeWall, h: 15, center: true}).translate([0, 0, 0]));
		const piHolderWithoutHoles = union(piHolderBase, piHolderSupports);
		const holes = placeScrewPorts(cylinder({r: screwHole, h: 15, center: true}));
		return difference(piHolderWithoutHoles, holes[0], holes[1], holes[2], holes[3]);
	}


	return [
		piHolder().translate([0, 0, 20]),
		difference(cube({size: [115, 70, 20], center: true}), battery(), battery().translate([bLength, 0, 0]))
	];
}