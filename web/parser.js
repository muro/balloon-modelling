'use strict';

function parseBalFile(fileContent) {
    // Treat the whole file as a stream of numbers, ignoring newlines.
    const tokens = fileContent.trim().split(/\s+/).map(Number);

    let currentIndex = 0;
    const nextToken = () => tokens[currentIndex++];

    const balloonCount = nextToken();
    const segments = nextToken();
    const pies = nextToken();
    const objUseColor = nextToken() !== 0;
    const aroundUseColor = nextToken() !== 0;

    // These are in the file but not used in the WebGL rendering yet.
    const object_style = nextToken();
    const around_style = nextToken();

    const balloons = [];
    for (let i = 0; i < balloonCount; i++) {
        const b = new Balloon();
        b.x = nextToken();
        b.y = nextToken();
        b.z = nextToken();
        b.radius = nextToken();
        b.pressure = nextToken();
        b.segments = segments;
        b.pies = pies;
        b.useColor = (i === 0) ? objUseColor : aroundUseColor;
        balloons.push(b);
    }

    return balloons;

    return mainBalloon;
}