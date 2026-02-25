/**
 *
 * pbWebGlShaders.js - data and support code for webGl shaders
 * 
 */


// TODO: move actual shader code out into new files?  Look into other ways to represent the shader code.
// TODO: simplify the addition of new shaders (so users can add new ones more easily)

/**
 * blitShaderPointAnimSources - uses glPoint to set position and expands it to provide space for square textures
 * No rotation, no skew.  Limited scaling.  Animation (specify the top left corner in the source texture).
 * 
*/
var blitShaderPointAnimSources = {
	fragment:
		"  precision mediump float;" +
		"  uniform sampler2D uImageSampler;" +
		"  varying mediump vec2 texSize;" +
		"  varying mediump vec2 texCoord;" +
		"  void main () {" +
		"    mediump vec2 coord = texCoord + (gl_PointCoord * texSize);" +
		"    gl_FragColor = texture2D(uImageSampler, coord);" +
		"  }",

	vertex:
		"  precision mediump float;" +
		"  attribute vec2 aPosition;" +
		"  attribute vec2 aTextureCoord;" +
		"  uniform float uSize;" +
		"  uniform vec2 uTextureSize;" +
		"  uniform mat3 uProjectionMatrix;" +
		"  varying mediump vec2 texSize;" +
		"  varying mediump vec2 texCoord;" +
		"  void main() {" +
		"    gl_PointSize = uSize;" +
		"    vec3 pos = vec3(aPosition, 1);" +
		"    gl_Position = vec4(uProjectionMatrix * pos, 1);" +
		"    texCoord = aTextureCoord;" +
		"    texSize = uTextureSize;" +
		"  }",

	attributes:
		[ "aPosition", "aTextureCoord" ],

	uniforms:
		[ "uProjectionMatrix", "uSize", "uTextureSize" ],

	sampler:
		"uImageSampler"
};


/**
 * blitShaderPointSources - uses glPoint to set position and expands it to provide space for square textures
 * No rotation, no animation, no skew.  Limited scaling.
 * Very fast.
 * 
 */
var blitShaderPointSources = {
	fragment:
		"  precision mediump float;" +
		"  uniform sampler2D uImageSampler;" +
		"  varying mediump vec2 texSize;" +
		"  void main () {" +
		"    mediump vec2 coord = gl_PointCoord * texSize;" +
		"    gl_FragColor = texture2D(uImageSampler, coord);" +
		"  }",

	vertex:
		"  precision mediump float;" +
		"  attribute vec2 aPosition;" +
		"  uniform float uSize;" +
		"  uniform vec2 uTextureSize;" +
		"  uniform mat3 uProjectionMatrix;" +
		"  varying mediump vec2 texSize;" +
		"  void main() {" +
		"    gl_PointSize = uSize;" +
		"    vec3 pos = vec3(aPosition, 1);" +
		"    gl_Position = vec4(uProjectionMatrix * pos, 1);" +
		"    texSize = uTextureSize;" +
		"  }",

	attributes:
		[ "aPosition" ],

	uniforms:
		[ "uProjectionMatrix", "uSize", "uTextureSize" ],

	sampler:
		"uImageSampler"
};


/**
 * blitShaderSources - shaders for image blitting 
 * no transform in the shader, simple particles
 * data = 24 floats per quad (4 corners * x,y,u,v plus 2 degenerate triangles to separate them)
 * @type {Array}
 */
var blitShaderSources = {
	fragment:
		"  precision lowp float;" +
		"  uniform sampler2D uImageSampler;" +
		"  varying vec2 vTexCoord;" +
		"  void main(void) {" +
		"    gl_FragColor = texture2D(uImageSampler, vTexCoord);" +
		"  }",

	vertex:
		"  precision lowp float;" +
		"  attribute vec4 aPosition;" +
		"  varying vec2 vTexCoord;" +
		"  void main(void) {" +
		"    gl_Position.zw = vec2(1, 1);" +
		"    gl_Position.xy = aPosition.xy;" +
		"    vTexCoord = aPosition.zw;" +
		"  }",

	attributes:
		[ "aPosition" ],

	sampler:
		"uImageSampler"
};


/**
 * imageShaderSources - shaders for single image drawing including matrix transforms for scalex,scaley, rotation and translation
 * @type {Array}
 */
var imageShaderSources = {
	fragment:
		"  precision mediump float;" +
		"  uniform sampler2D uImageSampler;" +
		"  varying vec2 vTexCoord;" +
		"  void main(void) {" +
		"    gl_FragColor = texture2D(uImageSampler, vTexCoord);" +
		"//    if (gl_FragColor.a < 0.80) discard;\n" +
		"  }",

	vertex:
		"  attribute vec4 aPosition;" +
		"  uniform float uZ;" +
		"  uniform mat3 uProjectionMatrix;" +
		"  uniform mat3 uModelMatrix;" +
		"  varying vec2 vTexCoord;" +
		"  void main(void) {" +
		"    vec3 pos = uProjectionMatrix * uModelMatrix * vec3(aPosition.xy, 1);" +
		"    gl_Position = vec4(pos.xy, uZ, 1);" +
		"    vTexCoord = aPosition.zw;" +
		"  }",

	attributes:
		[ "aPosition" ],

	uniforms:
		[ "uZ", "uProjectionMatrix", "uModelMatrix" ],

	sampler:
		"uImageSampler"
};


/**
 * batchImageShaderSources - shaders for batch image drawing
 * calculates the transform matrix from the values provided in the data buffer stream
 * @type {Array}
 */
var batchImageShaderSources = {
	fragment:
		"  precision mediump float;" +
		"  uniform sampler2D uImageSampler;" +
		"  varying vec2 vTexCoord;" +
		"  void main(void) {" +
		"    gl_FragColor = texture2D(uImageSampler, vTexCoord);" +
		"    if (gl_FragColor.a < 0.80) discard;" +
		"  }",

	vertex:
		"  attribute vec4 aPosition;" +
		"  attribute vec4 aTransform;" +
		"  attribute vec3 aTranslate;" +
		"  uniform mat3 uProjectionMatrix;" +
		"  varying vec2 vTexCoord;" +
		"  varying vec2 vAbsCoord;" +
		"  void main(void) {" +
		"    mat3 modelMatrix;" +
		"    modelMatrix[0] = vec3( aTransform.x * aTransform.z,-aTransform.y * aTransform.w, 0 );" +
		"    modelMatrix[1] = vec3( aTransform.y * aTransform.z, aTransform.x * aTransform.w, 0 );" +
		"    modelMatrix[2] = vec3( aTranslate.x, aTranslate.y, 1 );" +
		"    vec3 pos = uProjectionMatrix * modelMatrix * vec3( aPosition.xy, 1 );" +
		"    gl_Position = vec4(pos.xy, aTranslate.z, 1);" +
		"    vTexCoord = aPosition.zw;" +
		"  }",

	attributes:
		[ "aPosition", "aTransform", "aTranslate" ],

	uniforms:
		[ "uProjectionMatrix" ],

	sampler:
		"uImageSampler"
};


/**
 * rawBatchImageShaderSources - shaders for batch image drawing
 * requires the transform matrix in the data buffer stream
 * @type {Array}
 */
var rawBatchImageShaderSources = {
	fragment:
		"  precision mediump float;" +
		"  uniform sampler2D uImageSampler;" +
		"  varying vec2 vTexCoord;" +
		"  void main(void) {" +
		"    gl_FragColor = texture2D(uImageSampler, vTexCoord);" +
		"    if (gl_FragColor.a < 0.80) discard;" +
		"  }",

	vertex:
		"  attribute vec4 aPosition;" +
		"  attribute vec2 aModelMatrix0;" +
		"  attribute vec2 aModelMatrix1;" +
		"  attribute vec3 aModelMatrix2;" +
		"  uniform mat3 uProjectionMatrix;" +
		"  varying vec2 vTexCoord;" +
		"  void main(void) {" +
		"    float z = aModelMatrix2.z;" +
		"    mat3 modelMatrix;" +
		"    modelMatrix[0] = vec3(aModelMatrix0, 0);" +
		"    modelMatrix[1] = vec3(aModelMatrix1, 0);" +
		"    modelMatrix[2] = vec3(aModelMatrix2.xy, 1);" +
		"    vec3 pos = uProjectionMatrix * modelMatrix * vec3(aPosition.xy, 1);" +
		"    gl_Position = vec4(pos.xy, z, 1);" +
		"    vTexCoord = aPosition.zw;" +
		"  }",

	attributes:
		[ "aPosition", "aModelMatrix0", "aModelMatrix1", "aModelMatrix2" ],

	uniforms:
		[ "uProjectionMatrix" ],

	sampler:
		"uImageSampler"
};


/**
 * graphicsShaderSources - shaders for graphics primitive drawing
 * @type {Array}
 */
var graphicsShaderSources = {
	fragment:
		"  precision mediump float;" +
		"  varying vec4 vColor;" +
		"  void main(void) {" +
		"    gl_FragColor = vColor;" +
		"  }",

	vertex:
		"  uniform vec2 resolution;" +
		"  attribute vec2 aPosition;" +
		"  attribute vec4 aColor;" +
		"  varying vec4 vColor;" +
		"  void main(void) {" +
		"    vec2 zeroToOne = aPosition / resolution;" +
		"    vec2 zeroToTwo = zeroToOne * 2.0;" +
		"    vec2 clipSpace = zeroToTwo - 1.0;" +
		"    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);" +
		"    vColor = aColor;" +
		"  }",

	attributes:
		[ "aPosition", "aColor" ],

	uniforms:
		[ "resolution" ]
};


/**
 * imageShaderSource3D - shaders for single image drawing with 3D projection including matrix transforms for scalex,scaley, rotation and translation
 * @type {Array}
 */
var imageShaderSource3D = {
	fragment:
		"  precision mediump float;" +
		"  uniform sampler2D uImageSampler;" +
		"  varying vec2 vTexCoord;" +
		"  void main(void) {" +
		"    gl_FragColor = texture2D(uImageSampler, vTexCoord);" +
		"  }",

	vertex:
		"  precision mediump float;" +
		"  attribute vec4 aPosition;" +
		"  uniform float uZ;" +
		"  uniform mat4 uProjectionMatrix4;" +
		"  uniform mat4 uModelMatrix4;" +
		"  varying vec2 vTexCoord;" +
		"  void main(void) {" +
		"    vec4 pos = uProjectionMatrix4 * uModelMatrix4 * vec4(0, 0, 1, 1);" +
		"    gl_Position = vec4(pos.xyz, 1);" +
		"    vTexCoord = aPosition.zw;" +
		"  }",

	attributes:
		[ "aPosition" ],

	uniforms:
		[ "uZ", "uProjectionMatrix4", "uModelMatrix4" ],

	sampler:
		"uImageSampler"
};


/**
 * modezShaderSources - mode z shaders for single image drawing including matrix transforms for scalex,scaley, rotation and translation
 * @type {Array}
 */
var modezShaderSources = {
	fragment:
		"  precision mediump float;" +
		"  uniform sampler2D uImageSampler;" +
		"  varying vec2 vTexCoord;" +
		"  const float high = 10.0;" +
		"  void main(void) {" +
		"    float x = vTexCoord.x * 2.0 - 1.0;" +
		"    float y = vTexCoord.y * 2.0 - 1.0;" +
		"    float r = high / y;" +
		"    if (r > 0.0)" +
		"    {" +
		"      vec2 c = vec2(x * r * 0.02 + 0.5, r * 0.02);" +
		"      gl_FragColor = vec4(texture2D(uImageSampler, c).rgb, 1.0);" +
		"      if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0) discard;" +
		"    }" +
		"  }",
		//gl_FragColor = vec4(texture2D(uImageSampler, vTexCoord).rgb, 1.0);"

	vertex:
		"  precision mediump float;" +
		"  attribute vec4 aPosition;" +
		"  uniform float uZ;" +
		"  uniform mat3 uProjectionMatrix;" +
		"  uniform mat3 uModelMatrix;" +
		"  varying vec2 vTexCoord;" +
		"  void main(void) {" +
		"    vec3 pos = uProjectionMatrix * uModelMatrix * vec3(aPosition.xy, 1);" +
		"    gl_Position = vec4(pos.xy, uZ, 1);" +
		"    vTexCoord = aPosition.zw;" +
		"  }",

	attributes:
		[ "aPosition" ],

	uniforms:
		[ "uZ", "uProjectionMatrix", "uModelMatrix" ],

	sampler:
		"uImageSampler"
};


var simpleShaderSources = {
	fragment:
		" precision mediump float;" +
		" varying vec2 v_texcoord;" +
		" uniform sampler2D uImageSampler;" +
		" void main() {" +
    	"   gl_FragColor = texture2D(uImageSampler, v_texcoord);" +
		" }",

	vertex:
    	" attribute vec4 aPosition;" +
    	" varying vec2 v_texcoord;" +
		" void main() {" +
		"   gl_Position = aPosition;" +
		"   v_texcoord = aPosition.xy * 0.5 + 0.5;" +
		" }",

	attributes:
		[ "aPosition" ],

	sampler:
		"uImageSampler"
};




// static variables
pbWebGlShaders.currentProgram = null;



function pbWebGlShaders()
{
	// TODO: change this into a list
	this.graphicsShaderProgram = null;
	this.imageShaderProgram = null;
	this.imageShaderProgram3D = null;
	this.modezShaderProgram = null;
	this.simpleShaderProgram = null;
	this.blitShaderProgram = null;
	this.blitShaderPointProgram = null;
	this.blitShaderPointAnimProgram = null;
	this.batchImageShaderProgram = null;
	this.rawBatchImageShaderProgram = null;

	pbWebGlShaders.currentProgram = null;
}


// TODO: add a 'register' method which is called to add only the shader programs we're going to actually use for a given demo
pbWebGlShaders.prototype.create = function()
{
	// create the shader programs for each drawing mode
	
	// drawing
	this.graphicsShaderProgram = this.createProgram( graphicsShaderSources );

	// individual sprite processing
	this.imageShaderProgram = this.createProgram( imageShaderSources );
	this.imageShaderProgram3D = this.createProgram( imageShaderSource3D );
	this.modezShaderProgram = this.createProgram( modezShaderSources );
	this.simpleShaderProgram = this.createProgram( simpleShaderSources );

	// batch processing
	this.blitShaderProgram = this.createProgram( blitShaderSources );
	this.blitShaderPointProgram = this.createProgram( blitShaderPointSources );
	this.blitShaderPointAnimProgram = this.createProgram( blitShaderPointAnimSources );
	this.batchImageShaderProgram = this.createProgram( batchImageShaderSources );
	this.rawBatchImageShaderProgram = this.createProgram( rawBatchImageShaderSources );

};


// TODO: use the list of registered shaders
pbWebGlShaders.prototype.destroy = function()
{
	this.clearProgram();
	this.graphicsShaderProgram = null;
	this.imageShaderProgram = null;
	this.imageShaderProgram3D = null;
	this.modezShaderProgram = null;
	this.simpleShaderProgram = null;
	this.blitShaderProgram = null;
	this.blitShaderPointProgram = null;
	this.blitShaderPointAnimProgram = null;
	this.batchImageShaderProgram = null;
	this.rawBatchImageShaderProgram = null;

	pbWebGlShaders.currentProgram = null;
};


pbWebGlShaders.prototype._getShader = function( sources, typeString )
{
	// work out which type it is
	var type;
	switch ( typeString )
	{
		case "fragment":
			type = gl.FRAGMENT_SHADER;
			break;
		case "vertex":
			type = gl.VERTEX_SHADER;
			break;
		default:
			alert( "Unrecognised shader type: " + typeString );
			return null;
	}

	// create the correct shader type
	var shader = gl.createShader( type );

	// provide the shader source
	var source = sources[ typeString ];
	gl.shaderSource( shader, source );

	// compile the shader (and check for errors)
	gl.compileShader( shader );
	var status = gl.getShaderParameter( shader, gl.COMPILE_STATUS );
	if ( !status )
	{
		alert( "Shader compile error: " + gl.getShaderInfoLog( shader ) + "\n(" + typeString + ")" );
		gl.deleteShader( shader );
		return null;
	}

	return shader;
};


// based on code from http://learningwebgl.com/
pbWebGlShaders.prototype.createProgram = function( _source )
{
	console.log( "pbWebGlShaders.createProgram" );

	// create a new shader program
	var program = gl.createProgram();

	// get the fragment shader and attach it to the program
	var fragmentShader = this._getShader( _source, "fragment" );
	gl.attachShader( program, fragmentShader );

	// get the vertex shader and attach it to the program
	var vertexShader = this._getShader( _source, "vertex" );
	gl.attachShader( program, vertexShader );

	// link the attached shaders to the program
	gl.linkProgram( program );
	if ( !gl.getProgramParameter( program, gl.LINK_STATUS ) )
	{
		alert( "Could not create shader program: ", gl.getProgramInfoLog( program ) );
		console.log( "pbWebGlShaders.createProgram ERROR: ", gl.getProgramInfoLog( program ), "\n", _source );
		gl.deleteProgram( program );
		program = null;
		return null;
	}

	// add the parameter lists from the shader source object
	program.attributes = _source.attributes;
	program.uniforms = _source.uniforms;
	program.sampler = _source.sampler;

	return program;
};


pbWebGlShaders.prototype.setProgram = function(_program, _textureNumber)
{
	if (pbWebGlShaders.currentProgram != _program)
	{
		// remove the old program
		this.clearProgram();
		
		//console.log("pbWebGlShaders.setProgram", _program);
		
		// set the new program
		pbWebGlShaders.currentProgram = _program;
		gl.useProgram( pbWebGlShaders.currentProgram );

		// establish links to attributes and enable them
		if (pbWebGlShaders.currentProgram.attributes)
		{
			for(var a in pbWebGlShaders.currentProgram.attributes)
			{
				if (pbWebGlShaders.currentProgram.attributes.hasOwnProperty(a))
				{
					var attribute = pbWebGlShaders.currentProgram.attributes[a];
					pbWebGlShaders.currentProgram[attribute] = gl.getAttribLocation( pbWebGlShaders.currentProgram, attribute );
					if (pbWebGlShaders.currentProgram[attribute] === null)
						console.log("WARNING (pbWebGlShaders.setProgram): shader attribute returned NULL for", attribute, "it's probably unused in the shader");
					else
						gl.enableVertexAttribArray( pbWebGlShaders.currentProgram[attribute] );
				}
			}
		}

		// establish links to uniforms
		if (pbWebGlShaders.currentProgram.uniforms)
		{
			for(var u in pbWebGlShaders.currentProgram.uniforms)
			{
				if (pbWebGlShaders.currentProgram.uniforms.hasOwnProperty(u))
				{
					var uniform = pbWebGlShaders.currentProgram.uniforms[u];
					pbWebGlShaders.currentProgram[uniform] = gl.getUniformLocation( pbWebGlShaders.currentProgram, uniform );
					if (pbWebGlShaders.currentProgram[uniform] === null)
						console.log("WARNING (pbWebGlShaders.setProgram): shader uniform returned NULL for", uniform, "it's probably unused in the shader");
				}
			}
		}

		// establish link to the texture sampler
		if (pbWebGlShaders.currentProgram.sampler)
		{
			pbWebGlShaders.currentProgram.samplerUniform = gl.getUniformLocation( pbWebGlShaders.currentProgram, pbWebGlShaders.currentProgram.sampler );
		}
	}

	if (pbWebGlShaders.currentProgram.samplerUniform)
		// set the fragment shader sampler to use _textureNumber
	   	gl.uniform1i( pbWebGlShaders.currentProgram.samplerUniform, _textureNumber );
};


/**
 * 
 * http://www.mjbshaw.com/2013/03/webgl-fixing-invalidoperation.html
 *
 */
pbWebGlShaders.prototype.clearProgram = function()
{
	if (pbWebGlShaders.currentProgram)
	{
		// break links to all attributes and disable them
		if (pbWebGlShaders.currentProgram.attributes)
		{
			for(var a in pbWebGlShaders.currentProgram.attributes)
			{
				if (pbWebGlShaders.currentProgram.attributes.hasOwnProperty(a))
				{
					var value = pbWebGlShaders.currentProgram.attributes[a];
					gl.disableVertexAttribArray( value );
				}
			}
		}

		pbWebGlShaders.currentProgram = null;
	}
};

