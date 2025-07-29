'use strict';

function main() {
    const canvas = document.querySelector('#glcanvas');
    const gl = canvas.getContext('webgl');

    if (!gl) {
        alert('Unable to initialize WebGL. Your browser or machine may not support it.');
        return;
    }

    // Ensure the canvas is correctly sized before we do anything else.
    resizeCanvasToDisplaySize(gl.canvas);

    const vsSource = `
        attribute vec4 aVertexPosition;
        attribute vec3 aVertexNormal;
        attribute vec4 aVertexColor;

        uniform mat4 uNormalMatrix;
        uniform mat4 uModelViewMatrix;
        uniform mat4 uProjectionMatrix;
        
        varying lowp vec4 vColor;
        varying highp vec3 vLighting;

        void main(void) {
            gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
            vColor = aVertexColor;

            // Apply lighting
            highp vec3 ambientLight = vec3(0.3, 0.3, 0.3);
            highp vec3 directionalLightColor = vec3(1, 1, 1);
            highp vec3 directionalVector = normalize(vec3(0.85, 0.8, 0.75));
            
            highp vec4 transformedNormal = uNormalMatrix * vec4(aVertexNormal, 1.0);

            highp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);
            vLighting = ambientLight + (directionalLightColor * directional);
        }
    `;

    const fsSource = `
        varying lowp vec4 vColor;
        varying highp vec3 vLighting;

        void main(void) {
            gl_FragColor = vec4(vColor.rgb * vLighting, vColor.a);
        }
    `;

    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

    const programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            vertexNormal: gl.getAttribLocation(shaderProgram, 'aVertexNormal'),
            vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
            normalMatrix: gl.getUniformLocation(shaderProgram, 'uNormalMatrix'),
        },
    };

    let buffers = null;
    let boundingSphere = null;

    const icosphereCheckbox = document.getElementById('icosphere-checkbox');
    const colorCheckbox = document.getElementById('color-checkbox');
    const detailSlider = document.getElementById('detail-slider');
    const toggleBtn = document.getElementById('toggle-controls-btn');
    const controlsPanel = document.getElementById('controls-panel');

    function loadSample(category, sampleName) {
        const balloons = parseBalFile(samples[category][sampleName]);
        if (balloons.length === 0) return;

        const mainBalloon = balloons[0];
        const detail = parseInt(detailSlider.value);
        const useColor = colorCheckbox.checked;

        // 1. Setup the main balloon based on the controls
        if (icosphereCheckbox.checked) {
            mainBalloon.setupIcosphere(detail, useColor);
        } else {
            const segments = (detail + 1) * 8;
            const pies = (detail + 1) * 8;
            mainBalloon.setup(segments, pies, useColor);
        }

        // 2. Deform the main balloon using the others
        for (let i = 1; i < balloons.length; i++) {
            const deformer = balloons[i];
            deformer.setup(deformer.segments, deformer.pies, deformer.useColor);
            mainBalloon.deform(deformer);
        }
        
        buffers = initBuffers(gl, mainBalloon);
        boundingSphere = calculateBoundingSphere(mainBalloon.point_list);

        // Update active class in the list
        const sampleList = document.getElementById('sample-list');
        const currentActive = sampleList.querySelector('.active');
        if (currentActive) {
            currentActive.classList.remove('active');
        }
        const newActive = sampleList.querySelector(`[data-category="${category}"][data-sample="${sampleName}"]`);
        if (newActive) {
            newActive.classList.add('active');
        }
    }

    function reloadCurrentSample() {
        const activeSample = document.querySelector('#sample-list .active');
        if (activeSample) {
            const category = activeSample.dataset.category;
            const sampleName = activeSample.dataset.sample;
            loadSample(category, sampleName);
        }
    }

    icosphereCheckbox.addEventListener('change', reloadCurrentSample);
    colorCheckbox.addEventListener('change', reloadCurrentSample);
    detailSlider.addEventListener('input', reloadCurrentSample);

    toggleBtn.addEventListener('click', () => {
        controlsPanel.classList.toggle('hidden');
        toggleBtn.textContent = controlsPanel.classList.contains('hidden') ? '[ + ]' : '[ - ]';
    });

    // Populate the sample list
    const sampleList = document.getElementById('sample-list');
    for (const category in samples) {
        const categoryHeader = document.createElement('h4');
        categoryHeader.textContent = category;
        sampleList.appendChild(categoryHeader);

        const categoryList = document.createElement('ul');
        sampleList.appendChild(categoryList);

        for (const sampleName in samples[category]) {
            const li = document.createElement('li');
            li.textContent = sampleName;
            li.dataset.category = category;
            li.dataset.sample = sampleName;
            li.addEventListener('click', () => {
                loadSample(category, sampleName);
            });
            categoryList.appendChild(li);
        }
    }

    // Load the first sample by default
    const firstCategory = Object.keys(samples)[0];
    const firstSample = Object.keys(samples[firstCategory])[0];
    loadSample(firstCategory, firstSample);

    let rotationX = 0;
    let rotationY = 0;
    let zoom = 1.0;
    let dragging = false;
    let lastMouseX = -1;
    let lastMouseY = -1;

    function setZoom(factor) {
        zoom *= factor;
        zoom = Math.max(0.2, Math.min(zoom, 5.0)); // Clamp zoom level
    }

    canvas.addEventListener('mousedown', e => {
        dragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    });

    canvas.addEventListener('mouseup', () => {
        dragging = false;
    });

    canvas.addEventListener('mousemove', e => {
        if (!dragging) return;
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        rotationY += dx * 0.01;
        rotationX += dy * 0.01;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    });

    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        const zoomFactor = Math.pow(1.1, e.deltaY * -0.01);
        setZoom(zoomFactor);
    });

    // Touch events for mobile
    let lastPinchDist = 0;

    canvas.addEventListener('touchstart', e => {
        e.preventDefault();
        if (e.touches.length === 1) {
            dragging = true;
            lastMouseX = e.touches[0].clientX;
            lastMouseY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
            lastPinchDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
        }
    }, { passive: false });

    canvas.addEventListener('touchmove', e => {
        e.preventDefault();
        if (e.touches.length === 1 && dragging) {
            const dx = e.touches[0].clientX - lastMouseX;
            const dy = e.touches[0].clientY - lastMouseY;
            rotationY += dx * 0.01;
            rotationX += dy * 0.01;
            lastMouseX = e.touches[0].clientX;
            lastMouseY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
            const currentDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            if (lastPinchDist > 0) {
                const zoomFactor = currentDist / lastPinchDist;
                setZoom(zoomFactor);
            }
            lastPinchDist = currentDist;
        }
    }, { passive: false });

    canvas.addEventListener('touchend', e => {
        if (e.touches.length < 2) {
            lastPinchDist = 0;
        }
        if (e.touches.length < 1) {
            dragging = false;
        }
    });

    function render() {
        if (buffers) {
            drawScene(gl, programInfo, buffers, boundingSphere, rotationX, rotationY, zoom);
        }
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

function calculateBoundingSphere(points) {
    if (points.length === 0) {
        return { center: { x: 0, y: 0, z: 0 }, radius: 1 };
    }

    let minX = points[0].x, maxX = points[0].x;
    let minY = points[0].y, maxY = points[0].y;
    let minZ = points[0].z, maxZ = points[0].z;

    for (let i = 1; i < points.length; i++) {
        minX = Math.min(minX, points[i].x);
        maxX = Math.max(maxX, points[i].x);
        minY = Math.min(minY, points[i].y);
        maxY = Math.max(maxY, points[i].y);
        minZ = Math.min(minZ, points[i].z);
        maxZ = Math.max(maxZ, points[i].z);
    }

    const center = {
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2,
        z: (minZ + maxZ) / 2,
    };

    let radiusSq = 0;
    for (const p of points) {
        const distSq = (p.x - center.x) ** 2 + (p.y - center.y) ** 2 + (p.z - center.z) ** 2;
        radiusSq = Math.max(radiusSq, distSq);
    }

    return { center, radius: Math.sqrt(radiusSq) };
}

function initBuffers(gl, balloon) {
    const positions = [];
    const colors = [];
    const normals = [];
    const indices = [];
    
    for(let i = 0; i < balloon.point_list.length; i++) {
        const p = balloon.point_list[i];
        positions.push(p.x, p.y, p.z);
        normals.push(p.nx, p.ny, p.nz);
        colors.push(p.r, p.g, p.b, p.a);
        indices.push(i);
    }

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        color: colorBuffer,
        normal: normalBuffer,
        indices: indexBuffer,
        vertexCount: indices.length,
    };
}

function drawScene(gl, programInfo, buffers, boundingSphere, rotationX, rotationY, zoom) {
    // Exit if the canvas is not yet sized.
    if (gl.canvas.width === 0 || gl.canvas.height === 0) {
        return;
    }

    resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const fieldOfViewY = 45 * Math.PI / 180;
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, fieldOfViewY, aspect, 0.1, 1000.0);

    const modelViewMatrix = mat4.create();
    
    // Calculate distance to fit the bounding sphere in both dimensions
    const fieldOfViewX = 2 * Math.atan(Math.tan(fieldOfViewY / 2) * aspect);
    const distanceForY = boundingSphere.radius / Math.tan(fieldOfViewY / 2);
    const distanceForX = boundingSphere.radius / Math.tan(fieldOfViewX / 2);
    
    const distance = Math.max(distanceForX, distanceForY) * 1.2 / zoom; // *1.2 for padding

    mat4.translate(modelViewMatrix, modelViewMatrix, [0.0, 0.0, -distance]);

    mat4.rotate(modelViewMatrix, modelViewMatrix, rotationX, [1, 0, 0]);
    mat4.rotate(modelViewMatrix, modelViewMatrix, rotationY, [0, 1, 0]);
    
    // Center the object
    mat4.translate(modelViewMatrix, modelViewMatrix, [-boundingSphere.center.x, -boundingSphere.center.y, -boundingSphere.center.z]);

    const normalMatrix = mat4.create();
    mat4.invert(normalMatrix, modelViewMatrix);
    mat4.transpose(normalMatrix, normalMatrix);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexNormal);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
    gl.useProgram(programInfo.program);

    gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.normalMatrix, false, normalMatrix);

    gl.drawElements(gl.TRIANGLES, buffers.vertexCount, gl.UNSIGNED_SHORT, 0);
}

function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }
    return shaderProgram;
}

function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function resizeCanvasToDisplaySize(canvas) {
    const displayWidth  = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    if (canvas.width  !== displayWidth || canvas.height !== displayHeight) {
        canvas.width  = displayWidth;
        canvas.height = displayHeight;
    }
}

const mat4 = {
    create: () => {
        const out = new Float32Array(16);
        out[0] = 1; out[5] = 1; out[10] = 1; out[15] = 1;
        return out;
    },
    translate: (out, a, v) => {
        let x = v[0], y = v[1], z = v[2];
        out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
        out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
        out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
        out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
        if (a !== out) {
            out[0] = a[0]; out[1] = a[1]; out[2] = a[2]; out[3] = a[3];
            out[4] = a[4]; out[5] = a[5]; out[6] = a[6]; out[7] = a[7];
            out[8] = a[8]; out[9] = a[9]; out[10] = a[10]; out[11] = a[11];
        }
        return out;
    },
    rotate: (out, a, rad, axis) => {
        let [x, y, z] = axis;
        let len = Math.hypot(x, y, z);
        if (len < 0.000001) { return null; }
        len = 1 / len; x *= len; y *= len; z *= len;
        const s = Math.sin(rad), c = Math.cos(rad), t = 1 - c;
        const b00 = x*x*t+c, b01 = y*x*t+z*s, b02 = z*x*t-y*s;
        const b10 = x*y*t-z*s, b11 = y*y*t+c, b12 = z*y*t+x*s;
        const b20 = x*z*t+y*s, b21 = y*z*t-x*s, b22 = z*z*t+c;
        const a00=a[0],a01=a[1],a02=a[2],a03=a[3],a10=a[4],a11=a[5],a12=a[6],a13=a[7],a20=a[8],a21=a[9],a22=a[10],a23=a[11];
        out[0]=a00*b00+a10*b01+a20*b02; out[1]=a01*b00+a11*b01+a21*b02; out[2]=a02*b00+a12*b01+a22*b02; out[3]=a03*b00+a13*b01+a23*b02;
        out[4]=a00*b10+a10*b11+a20*b12; out[5]=a01*b10+a11*b11+a21*b12; out[6]=a02*b10+a12*b11+a22*b12; out[7]=a03*b10+a13*b11+a23*b12;
        out[8]=a00*b20+a10*b21+a20*b22; out[9]=a01*b20+a11*b21+a21*b22; out[10]=a02*b20+a12*b21+a22*b22; out[11]=a03*b20+a13*b21+a23*b22;
        if(a!==out){out[12]=a[12];out[13]=a[13];out[14]=a[14];out[15]=a[15];}
        return out;
    },
    perspective: (out, fovy, aspect, near, far) => {
        const f = 1.0 / Math.tan(fovy / 2);
        const nf = 1 / (near - far);
        out[0]=f/aspect; out[1]=0; out[2]=0; out[3]=0;
        out[4]=0; out[5]=f; out[6]=0; out[7]=0;
        out[8]=0; out[9]=0; out[11]=-1; out[12]=0; out[13]=0; out[15]=0;
        if(far!=null&&far!==Infinity){out[10]=(far+near)*nf;out[14]=2*far*near*nf;}
        else{out[10]=-1;out[14]=-2*near;}
        return out;
    },
    invert: (out, a) => {
        const a00=a[0],a01=a[1],a02=a[2],a03=a[3],a10=a[4],a11=a[5],a12=a[6],a13=a[7],a20=a[8],a21=a[9],a22=a[10],a23=a[11],a30=a[12],a31=a[13],a32=a[14],a33=a[15];
        const b00=a00*a11-a01*a10,b01=a00*a12-a02*a10,b02=a00*a13-a03*a10,b03=a01*a12-a02*a11,b04=a01*a13-a03*a11,b05=a02*a13-a03*a12;
        const b06=a20*a31-a21*a30,b07=a20*a32-a22*a30,b08=a20*a33-a23*a30,b09=a21*a32-a22*a31,b10=a21*a33-a23*a31,b11=a22*a33-a23*a32;
        let det=b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06;
        if(!det){return null;}
        det=1/det;
        out[0]=(a11*b11-a12*b10+a13*b09)*det;out[1]=(a02*b10-a01*b11-a03*b09)*det;out[2]=(a31*b05-a32*b04+a33*b03)*det;out[3]=(a22*b04-a21*b05-a23*b03)*det;
        out[4]=(a12*b08-a10*b11-a13*b07)*det;out[5]=(a00*b11-a02*b08+a03*b07)*det;out[6]=(a32*b02-a30*b05-a33*b01)*det;out[7]=(a20*b05-a22*b02+a23*b01)*det;
        out[8]=(a10*b10-a11*b08+a13*b06)*det;out[9]=(a01*b08-a00*b10-a03*b06)*det;out[10]=(a30*b04-a31*b02+a33*b00)*det;out[11]=(a21*b02-a20*b04-a23*b00)*det;
        out[12]=(a11*b07-a10*b09-a12*b06)*det;out[13]=(a00*b09-a01*b07+a02*b06)*det;out[14]=(a31*b01-a30*b03-a32*b00)*det;out[15]=(a20*b03-a21*b01+a22*b00)*det;
        return out;
    },
    transpose: (out, a) => {
        if(out===a){
            const a01=a[1],a02=a[2],a03=a[3],a12=a[6],a13=a[7],a23=a[11];
            out[1]=a[4];out[2]=a[8];out[3]=a[12];out[4]=a01;out[6]=a[9];out[7]=a[13];out[8]=a02;out[9]=a12;out[11]=a[14];out[12]=a03;out[13]=a13;out[14]=a23;
        }else{
            out[0]=a[0];out[1]=a[4];out[2]=a[8];out[3]=a[12];out[4]=a[1];out[5]=a[5];out[6]=a[9];out[7]=a[13];out[8]=a[2];out[9]=a[6];out[10]=a[10];out[11]=a[14];out[12]=a[3];out[13]=a[7];out[14]=a[11];out[15]=a[15];
        }
        return out;
    }
};

window.onload = main;