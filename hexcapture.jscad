function main() {
	function regularEvenPolygon(pointNum, width) {
		var points = [];
		for (var i = 0; i < pointNum; ++i) {
			var theta = (2 * Math.PI / pointNum) * i;
			points.push([Math.cos(theta) * width, Math.sin(theta) * width]);
		}
		return new CSG.Path2D(points, true).innerToCAG();
	}
	function captureHexNut(hexRadius, hexHeight, cylHeight, screwWidth) {
		const base = cylinder({r: hexRadius + 2, h: cylHeight, center: true});
		const hexagon = regularEvenPolygon(6, hexRadius);
		const hexagonExtrude = linear_extrude({height: hexHeight, center: true}, hexagon).translate([0, 0, hexHeight - cylHeight]);
		const screwHole = cylinder({d: screwWidth, h: cylHeight, center: true});
		return difference(base, hexagonExtrude, screwHole);
	}

	return captureHexNut(5, 5, 10, 2.5);
}