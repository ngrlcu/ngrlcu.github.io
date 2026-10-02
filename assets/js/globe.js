/*! Includes three.js r170 (MIT License, threejs.org/LICENSE). */
import{A as KA,B as re,C as se,D as ae,E as H,F as ce,G as le,b as $A,c as rA,d as R,e as K,f as d,g as D,h as sA,i as Ae,j as aA,k as ee,l as W,m as kA,n as wA,o as cA,p as xA,q,r as te,s as Y,t as j,u as ne,v as ie,w as oe,x as k}from"./three-SWPYOARE.js";var de=new D,lA=new d,_=class extends ae{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry";let A=[-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],t=[-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],n=[0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5];this.setIndex(n),this.setAttribute("position",new kA(A,3)),this.setAttribute("uv",new kA(t,2))}applyMatrix4(A){let t=this.attributes.instanceStart,n=this.attributes.instanceEnd;return t!==void 0&&(t.applyMatrix4(A),n.applyMatrix4(A),t.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}setPositions(A){let t;A instanceof Float32Array?t=A:Array.isArray(A)&&(t=new Float32Array(A));let n=new H(t,6,1);return this.setAttribute("instanceStart",new k(n,3,0)),this.setAttribute("instanceEnd",new k(n,3,3)),this.instanceCount=this.attributes.instanceStart.count,this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(A){let t;A instanceof Float32Array?t=A:Array.isArray(A)&&(t=new Float32Array(A));let n=new H(t,6,1);return this.setAttribute("instanceColorStart",new k(n,3,0)),this.setAttribute("instanceColorEnd",new k(n,3,3)),this}fromWireframeGeometry(A){return this.setPositions(A.attributes.position.array),this}fromEdgesGeometry(A){return this.setPositions(A.attributes.position.array),this}fromMesh(A){return this.fromWireframeGeometry(new se(A.geometry)),this}fromLineSegments(A){let t=A.geometry;return this.setPositions(t.attributes.position.array),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new D);let A=this.attributes.instanceStart,t=this.attributes.instanceEnd;A!==void 0&&t!==void 0&&(this.boundingBox.setFromBufferAttribute(A),de.setFromBufferAttribute(t),this.boundingBox.union(de))}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new sA),this.boundingBox===null&&this.computeBoundingBox();let A=this.attributes.instanceStart,t=this.attributes.instanceEnd;if(A!==void 0&&t!==void 0){let n=this.boundingSphere.center;this.boundingBox.getCenter(n);let i=0;for(let c=0,g=A.count;c<g;c++)lA.fromBufferAttribute(A,c),i=Math.max(i,n.distanceToSquared(lA)),lA.fromBufferAttribute(t,c),i=Math.max(i,n.distanceToSquared(lA));this.boundingSphere.radius=Math.sqrt(i),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}applyMatrix(A){return console.warn("THREE.LineSegmentsGeometry: applyMatrix() has been renamed to applyMatrix4()."),this.applyMatrix4(A)}};Y.line={worldUnits:{value:1},linewidth:{value:1},resolution:{value:new rA(1,1)},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}};j.line={uniforms:xA.merge([Y.common,Y.fog,Y.line]),vertexShader:`
		#include <common>
		#include <color_pars_vertex>
		#include <fog_pars_vertex>
		#include <logdepthbuf_pars_vertex>
		#include <clipping_planes_pars_vertex>

		uniform float linewidth;
		uniform vec2 resolution;

		attribute vec3 instanceStart;
		attribute vec3 instanceEnd;

		attribute vec3 instanceColorStart;
		attribute vec3 instanceColorEnd;

		#ifdef WORLD_UNITS

			varying vec4 worldPos;
			varying vec3 worldStart;
			varying vec3 worldEnd;

			#ifdef USE_DASH

				varying vec2 vUv;

			#endif

		#else

			varying vec2 vUv;

		#endif

		#ifdef USE_DASH

			uniform float dashScale;
			attribute float instanceDistanceStart;
			attribute float instanceDistanceEnd;
			varying float vLineDistance;

		#endif

		void trimSegment( const in vec4 start, inout vec4 end ) {

			// trim end segment so it terminates between the camera plane and the near plane

			// conservative estimate of the near plane
			float a = projectionMatrix[ 2 ][ 2 ]; // 3nd entry in 3th column
			float b = projectionMatrix[ 3 ][ 2 ]; // 3nd entry in 4th column
			float nearEstimate = - 0.5 * b / a;

			float alpha = ( nearEstimate - start.z ) / ( end.z - start.z );

			end.xyz = mix( start.xyz, end.xyz, alpha );

		}

		void main() {

			#ifdef USE_COLOR

				vColor.xyz = ( position.y < 0.5 ) ? instanceColorStart : instanceColorEnd;

			#endif

			#ifdef USE_DASH

				vLineDistance = ( position.y < 0.5 ) ? dashScale * instanceDistanceStart : dashScale * instanceDistanceEnd;
				vUv = uv;

			#endif

			float aspect = resolution.x / resolution.y;

			// camera space
			vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );
			vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );

			#ifdef WORLD_UNITS

				worldStart = start.xyz;
				worldEnd = end.xyz;

			#else

				vUv = uv;

			#endif

			// special case for perspective projection, and segments that terminate either in, or behind, the camera plane
			// clearly the gpu firmware has a way of addressing this issue when projecting into ndc space
			// but we need to perform ndc-space calculations in the shader, so we must address this issue directly
			// perhaps there is a more elegant solution -- WestLangley

			bool perspective = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ); // 4th entry in the 3rd column

			if ( perspective ) {

				if ( start.z < 0.0 && end.z >= 0.0 ) {

					trimSegment( start, end );

				} else if ( end.z < 0.0 && start.z >= 0.0 ) {

					trimSegment( end, start );

				}

			}

			// clip space
			vec4 clipStart = projectionMatrix * start;
			vec4 clipEnd = projectionMatrix * end;

			// ndc space
			vec3 ndcStart = clipStart.xyz / clipStart.w;
			vec3 ndcEnd = clipEnd.xyz / clipEnd.w;

			// direction
			vec2 dir = ndcEnd.xy - ndcStart.xy;

			// account for clip-space aspect ratio
			dir.x *= aspect;
			dir = normalize( dir );

			#ifdef WORLD_UNITS

				vec3 worldDir = normalize( end.xyz - start.xyz );
				vec3 tmpFwd = normalize( mix( start.xyz, end.xyz, 0.5 ) );
				vec3 worldUp = normalize( cross( worldDir, tmpFwd ) );
				vec3 worldFwd = cross( worldDir, worldUp );
				worldPos = position.y < 0.5 ? start: end;

				// height offset
				float hw = linewidth * 0.5;
				worldPos.xyz += position.x < 0.0 ? hw * worldUp : - hw * worldUp;

				// don't extend the line if we're rendering dashes because we
				// won't be rendering the endcaps
				#ifndef USE_DASH

					// cap extension
					worldPos.xyz += position.y < 0.5 ? - hw * worldDir : hw * worldDir;

					// add width to the box
					worldPos.xyz += worldFwd * hw;

					// endcaps
					if ( position.y > 1.0 || position.y < 0.0 ) {

						worldPos.xyz -= worldFwd * 2.0 * hw;

					}

				#endif

				// project the worldpos
				vec4 clip = projectionMatrix * worldPos;

				// shift the depth of the projected points so the line
				// segments overlap neatly
				vec3 clipPose = ( position.y < 0.5 ) ? ndcStart : ndcEnd;
				clip.z = clipPose.z * clip.w;

			#else

				vec2 offset = vec2( dir.y, - dir.x );
				// undo aspect ratio adjustment
				dir.x /= aspect;
				offset.x /= aspect;

				// sign flip
				if ( position.x < 0.0 ) offset *= - 1.0;

				// endcaps
				if ( position.y < 0.0 ) {

					offset += - dir;

				} else if ( position.y > 1.0 ) {

					offset += dir;

				}

				// adjust for linewidth
				offset *= linewidth;

				// adjust for clip-space to screen-space conversion // maybe resolution should be based on viewport ...
				offset /= resolution.y;

				// select end
				vec4 clip = ( position.y < 0.5 ) ? clipStart : clipEnd;

				// back to clip space
				offset *= clip.w;

				clip.xy += offset;

			#endif

			gl_Position = clip;

			vec4 mvPosition = ( position.y < 0.5 ) ? start : end; // this is an approximation

			#include <logdepthbuf_vertex>
			#include <clipping_planes_vertex>
			#include <fog_vertex>

		}
		`,fragmentShader:`
		uniform vec3 diffuse;
		uniform float opacity;
		uniform float linewidth;

		#ifdef USE_DASH

			uniform float dashOffset;
			uniform float dashSize;
			uniform float gapSize;

		#endif

		varying float vLineDistance;

		#ifdef WORLD_UNITS

			varying vec4 worldPos;
			varying vec3 worldStart;
			varying vec3 worldEnd;

			#ifdef USE_DASH

				varying vec2 vUv;

			#endif

		#else

			varying vec2 vUv;

		#endif

		#include <common>
		#include <color_pars_fragment>
		#include <fog_pars_fragment>
		#include <logdepthbuf_pars_fragment>
		#include <clipping_planes_pars_fragment>

		vec2 closestLineToLine(vec3 p1, vec3 p2, vec3 p3, vec3 p4) {

			float mua;
			float mub;

			vec3 p13 = p1 - p3;
			vec3 p43 = p4 - p3;

			vec3 p21 = p2 - p1;

			float d1343 = dot( p13, p43 );
			float d4321 = dot( p43, p21 );
			float d1321 = dot( p13, p21 );
			float d4343 = dot( p43, p43 );
			float d2121 = dot( p21, p21 );

			float denom = d2121 * d4343 - d4321 * d4321;

			float numer = d1343 * d4321 - d1321 * d4343;

			mua = numer / denom;
			mua = clamp( mua, 0.0, 1.0 );
			mub = ( d1343 + d4321 * ( mua ) ) / d4343;
			mub = clamp( mub, 0.0, 1.0 );

			return vec2( mua, mub );

		}

		void main() {

			#include <clipping_planes_fragment>

			#ifdef USE_DASH

				if ( vUv.y < - 1.0 || vUv.y > 1.0 ) discard; // discard endcaps

				if ( mod( vLineDistance + dashOffset, dashSize + gapSize ) > dashSize ) discard; // todo - FIX

			#endif

			float alpha = opacity;

			#ifdef WORLD_UNITS

				// Find the closest points on the view ray and the line segment
				vec3 rayEnd = normalize( worldPos.xyz ) * 1e5;
				vec3 lineDir = worldEnd - worldStart;
				vec2 params = closestLineToLine( worldStart, worldEnd, vec3( 0.0, 0.0, 0.0 ), rayEnd );

				vec3 p1 = worldStart + lineDir * params.x;
				vec3 p2 = rayEnd * params.y;
				vec3 delta = p1 - p2;
				float len = length( delta );
				float norm = len / linewidth;

				#ifndef USE_DASH

					#ifdef USE_ALPHA_TO_COVERAGE

						float dnorm = fwidth( norm );
						alpha = 1.0 - smoothstep( 0.5 - dnorm, 0.5 + dnorm, norm );

					#else

						if ( norm > 0.5 ) {

							discard;

						}

					#endif

				#endif

			#else

				#ifdef USE_ALPHA_TO_COVERAGE

					// artifacts appear on some hardware if a derivative is taken within a conditional
					float a = vUv.x;
					float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
					float len2 = a * a + b * b;
					float dlen = fwidth( len2 );

					if ( abs( vUv.y ) > 1.0 ) {

						alpha = 1.0 - smoothstep( 1.0 - dlen, 1.0 + dlen, len2 );

					}

				#else

					if ( abs( vUv.y ) > 1.0 ) {

						float a = vUv.x;
						float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
						float len2 = a * a + b * b;

						if ( len2 > 1.0 ) discard;

					}

				#endif

			#endif

			vec4 diffuseColor = vec4( diffuse, alpha );

			#include <logdepthbuf_fragment>
			#include <color_fragment>

			gl_FragColor = vec4( diffuseColor.rgb, alpha );

			#include <tonemapping_fragment>
			#include <colorspace_fragment>
			#include <fog_fragment>
			#include <premultiplied_alpha_fragment>

		}
		`};var w=class extends q{static get type(){return"LineMaterial"}constructor(A){super({uniforms:xA.clone(j.line.uniforms),vertexShader:j.line.vertexShader,fragmentShader:j.line.fragmentShader,clipping:!0}),this.isLineMaterial=!0,this.setValues(A)}get color(){return this.uniforms.diffuse.value}set color(A){this.uniforms.diffuse.value=A}get worldUnits(){return"WORLD_UNITS"in this.defines}set worldUnits(A){A===!0?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}get linewidth(){return this.uniforms.linewidth.value}set linewidth(A){this.uniforms.linewidth&&(this.uniforms.linewidth.value=A)}get dashed(){return"USE_DASH"in this.defines}set dashed(A){A===!0!==this.dashed&&(this.needsUpdate=!0),A===!0?this.defines.USE_DASH="":delete this.defines.USE_DASH}get dashScale(){return this.uniforms.dashScale.value}set dashScale(A){this.uniforms.dashScale.value=A}get dashSize(){return this.uniforms.dashSize.value}set dashSize(A){this.uniforms.dashSize.value=A}get dashOffset(){return this.uniforms.dashOffset.value}set dashOffset(A){this.uniforms.dashOffset.value=A}get gapSize(){return this.uniforms.gapSize.value}set gapSize(A){this.uniforms.gapSize.value=A}get opacity(){return this.uniforms.opacity.value}set opacity(A){this.uniforms&&(this.uniforms.opacity.value=A)}get resolution(){return this.uniforms.resolution.value}set resolution(A){this.uniforms.resolution.value.copy(A)}get alphaToCoverage(){return"USE_ALPHA_TO_COVERAGE"in this.defines}set alphaToCoverage(A){this.defines&&(A===!0!==this.alphaToCoverage&&(this.needsUpdate=!0),A===!0?this.defines.USE_ALPHA_TO_COVERAGE="":delete this.defines.USE_ALPHA_TO_COVERAGE)}};var MA=new R,ge=new d,pe=new d,p=new R,f=new R,C=new R,bA=new d,TA=new Ae,u=new le,fe=new d,dA=new D,gA=new sA,Q=new R,v,M;function ue(a,A,t){return Q.set(0,0,-A,1).applyMatrix4(a.projectionMatrix),Q.multiplyScalar(1/Q.w),Q.x=M/t.width,Q.y=M/t.height,Q.applyMatrix4(a.projectionMatrixInverse),Q.multiplyScalar(1/Q.w),Math.abs(Math.max(Q.x,Q.y))}function Je(a,A){let t=a.matrixWorld,n=a.geometry,i=n.attributes.instanceStart,c=n.attributes.instanceEnd,g=Math.min(n.instanceCount,i.count);for(let s=0,l=g;s<l;s++){u.start.fromBufferAttribute(i,s),u.end.fromBufferAttribute(c,s),u.applyMatrix4(t);let B=new d,m=new d;v.distanceSqToSegment(u.start,u.end,m,B),m.distanceTo(B)<M*.5&&A.push({point:m,pointOnLine:B,distance:v.origin.distanceTo(m),object:a,face:null,faceIndex:s,uv:null,uv1:null})}}function ke(a,A,t){let n=A.projectionMatrix,c=a.material.resolution,g=a.matrixWorld,s=a.geometry,l=s.attributes.instanceStart,B=s.attributes.instanceEnd,m=Math.min(s.instanceCount,l.count),h=-A.near;v.at(1,C),C.w=1,C.applyMatrix4(A.matrixWorldInverse),C.applyMatrix4(n),C.multiplyScalar(1/C.w),C.x*=c.x/2,C.y*=c.y/2,C.z=0,bA.copy(C),TA.multiplyMatrices(A.matrixWorldInverse,g);for(let I=0,hA=m;I<hA;I++){if(p.fromBufferAttribute(l,I),f.fromBufferAttribute(B,I),p.w=1,f.w=1,p.applyMatrix4(TA),f.applyMatrix4(TA),p.z>h&&f.z>h)continue;if(p.z>h){let x=p.z-f.z,S=(p.z-h)/x;p.lerp(f,S)}else if(f.z>h){let x=f.z-p.z,S=(f.z-h)/x;f.lerp(p,S)}p.applyMatrix4(n),f.applyMatrix4(n),p.multiplyScalar(1/p.w),f.multiplyScalar(1/f.w),p.x*=c.x/2,p.y*=c.y/2,f.x*=c.x/2,f.y*=c.y/2,u.start.copy(p),u.start.z=0,u.end.copy(f),u.end.z=0;let U=u.closestPointToPointParameter(bA,!0);u.at(U,fe);let L=$A.lerp(p.z,f.z,U),N=L>=-1&&L<=1,b=bA.distanceTo(fe)<M*.5;if(N&&b){u.start.fromBufferAttribute(l,I),u.end.fromBufferAttribute(B,I),u.start.applyMatrix4(g),u.end.applyMatrix4(g);let x=new d,S=new d;v.distanceSqToSegment(u.start,u.end,S,x),t.push({point:S,pointOnLine:x,distance:v.origin.distanceTo(S),object:a,face:null,faceIndex:I,uv:null,uv1:null})}}}var pA=class extends cA{constructor(A=new _,t=new w({color:Math.random()*16777215})){super(A,t),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){let A=this.geometry,t=A.attributes.instanceStart,n=A.attributes.instanceEnd,i=new Float32Array(2*t.count);for(let g=0,s=0,l=t.count;g<l;g++,s+=2)ge.fromBufferAttribute(t,g),pe.fromBufferAttribute(n,g),i[s]=s===0?0:i[s-1],i[s+1]=i[s]+ge.distanceTo(pe);let c=new H(i,2,1);return A.setAttribute("instanceDistanceStart",new k(c,1,0)),A.setAttribute("instanceDistanceEnd",new k(c,1,1)),this}raycast(A,t){let n=this.material.worldUnits,i=A.camera;i===null&&!n&&console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.');let c=A.params.Line2!==void 0&&A.params.Line2.threshold||0;v=A.ray;let g=this.matrixWorld,s=this.geometry,l=this.material;M=l.linewidth+c,s.boundingSphere===null&&s.computeBoundingSphere(),gA.copy(s.boundingSphere).applyMatrix4(g);let B;if(n)B=M*.5;else{let h=Math.max(i.near,gA.distanceToPoint(v.origin));B=ue(i,h,l.resolution)}if(gA.radius+=B,v.intersectsSphere(gA)===!1)return;s.boundingBox===null&&s.computeBoundingBox(),dA.copy(s.boundingBox).applyMatrix4(g);let m;if(n)m=M*.5;else{let h=Math.max(i.near,dA.distanceToPoint(v.origin));m=ue(i,h,l.resolution)}dA.expandByScalar(m),v.intersectsBox(dA)!==!1&&(n?Je(this,t):ke(this,i,t))}onBeforeRender(A){let t=this.material.uniforms;t&&t.resolution&&(A.getViewport(MA),this.material.uniforms.resolution.value.set(MA.z,MA.w))}};var G=class extends _{constructor(){super(),this.isLineGeometry=!0,this.type="LineGeometry"}setPositions(A){let t=A.length-3,n=new Float32Array(2*t);for(let i=0;i<t;i+=3)n[2*i]=A[i],n[2*i+1]=A[i+1],n[2*i+2]=A[i+2],n[2*i+3]=A[i+3],n[2*i+4]=A[i+4],n[2*i+5]=A[i+5];return super.setPositions(n),this}setColors(A){let t=A.length-3,n=new Float32Array(2*t);for(let i=0;i<t;i+=3)n[2*i]=A[i],n[2*i+1]=A[i+1],n[2*i+2]=A[i+2],n[2*i+3]=A[i+3],n[2*i+4]=A[i+4],n[2*i+5]=A[i+5];return super.setColors(n),this}fromLine(A){let t=A.geometry;return this.setPositions(t.attributes.position.array),this}};var fA=class extends pA{constructor(A=new G,t=new w({color:Math.random()*16777215})){super(A,t),this.isLine2=!0,this.type="Line2"}};var he="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pKCAEBQSAkJCWAhIAQWhKCQEhISCEBQSCkJCWAhISQWhKCQEhISCEJACCkJRSAgICQUhICQUhISCEJASAkJRSQgICQUhICQUhICSEBCSCkJBSSgICQUhICUUhKCSEJASCkJASSgIAQUhICQVhICyUBASCkJBSSgIAWUhICQVhICSUBASCkJASSgIAWWhICUUhICSUBACCkJASSgIASWhICUUhIKSUBQCikJBSioIASWhIAQUhICSUBACCkJBSioIACWhIAQUhYCSUBACSkJBCCoIASWhKAQUhIKQVBAASkJBCSgIASWhIAAUhIISVBAASkJRASgIAQWhIAAUhIISVBAASlJRACgIBQWoIAAUpKICUBACCkJBACgKRQWoIAAUpKICUBAACkBBACgIRQWoIAAUpIICUBCKClBBACgIRQWgIAAUoIIAUBCIClBBAChIBQWgIBAVgIIAUBCKClBBAChABQWgIBAVgIIAUBCKCkBBICpABQGgIBQVgIIAUAAKCkBBICpABQGgIBQVoIJAVIAKCkBBKCpABQGoABQVgIJAVICKAkBRKCpARYGoABQUgIJAVIAKAlABKCoABYGoABQEgIJQVIAKAlERKCgABYGoABUUgAJQVAAKAlEhKAgABaGoABUUggJQUAAKAlERKCoABaCoABUVogJQUAAKAlERKioABaCgCBUUogJQVAAKwFEBKigEBaCgCBQEogJQFAAKQFEBKihEBaCgCBUQoiJUVACKSEERKihEBaCoCBQQogJUUAyKSEERKiAERaCoCBSQoiJUUAwKSEERKCAEBaCoGBSQgiJUQAgKwFERKCAERaigGBSQgiJQQAgKQEExKCAEBaiAGBSQoiJQQAgKQFExKCAFBaiAGBSRgiJQQAwKQEExKCAHRaCAGBSQgmJQQAwKQAExKCAFRaiAGBSAg2JQQAoKUAExKCAFRaCAEBSAgmJUQAqKUAExKCAFRaiAEBSAAmJUQAqKUAEhKAAFxaiAFBSBI2JUQAqKQAEhKAAFhKiAFBSAAmJUAIqKQAEhKABHhKCAFBWBAkJUAAoKQQEpKAAHhKCAFBSBAkJQAIoIQQEpKAAHxKAAFBSAAlJQAAoIQQEpKAAFxKAAFBWAAlJQAAoIQQEoKAAFxKAAFBSCAlJQAAoIQQEoKAAFhKAAFBCCAlBQAAoIQQEoKABFpKAAFBCCAlBQAAoIQQEoIARFoKAAFBCCAlBQAApIQQEoIARFoKAIFBCCAlBQAIpAQQEoIARFoKAIFJGCAlBACIpCQQEoIAQFoKAAFIGCAlBACIpGQREoIgUFoKAAFIWCAlBACApAQQEoAgUFoIgQFIWCIlBECApAQQEoAgUFoIgQFIGCIlBECgpAEQEoCgUFoIgQFICCIlAUCgpAEQEoAgVFoIgUFICiIlAUCgpAEQEoAgVFoCgUFIAiAlAUCopAEQkoAkVFoCgUFIAiAlAEiopAUSkoAkVEoCgUFIEiAlAEiohAUSgoAkUEoCgUFIGiElAEioxAUSgoAkUEoAgUEYGiEFAEiohAUSgoAkUEoAgUEYGiEFAEighAESgiAkUloAgUEYGiUEAEighAESgiAkUhoAgUEYEiUEQEigpAESgiAkWhiAgUEYEiUEQEigJAESgiAkWhiAgUEYAiUEQEikJQESgiAkWgiAgUBaAiUEQEjkIRUSgiQkWgiAgUBaAiUEQEikARESgKQkWgiAgUhaAiUESEikARESgKQEWgiAgUgSIiUBSEikARESgKQEWgiAgVgSIiUBSEikARESgKRUWgCAgVgSIiUBSEikARECoCRUSgKAgVgSIgUBSAikARECoCRUSgKAgVgSIgUASKiEARECoCRUCgKAgVgSIgVASKiEARECoCRUCgCBgRgSIgVASKgEARECICRUCgCBQRgSIgVASKgEARECICRUCoCBQBgSIgVASKgEAROCICRUCoCBQBgSIgRASKgEARKAICRUCoCBQBgSJgRASKgFARKAICRUCICBQBgSJgRASKgFARKAICRcCICBQBgSJQBASKgBARKAICRcCICBQBoSJQBASKgBARKAICRYAICBQBISJQBASKgBERKAICRaAICBQBISJQBASKgBEQKAJCRKAICBQBIyBQBASKABEQKAJCRKAICBQBIyBQBASIABEQKAJCQKAICBQBIiBQBISIQBEQKABGQKAICBABIiBQAISIQBEQKABEQKAACBCBIiBQAISAQAEQIABEQKAACBGBAiBQAIiAQAEQIABEQKAACAGBAiBAAAiAAAEQIgIEQIAAEAEBAiBAAAiAAAEQAgAEQIAAEAABAiAAAAiAAAEgAAAEQAAAEAgBAiAAAAiAAAEgAAAEQAAAEAABAmAAAAiAAAEgAAIEQAAAEAABAkAAAAiAAAAgAAIEQAAAEAABAkAAAAiAAAAgEAIEgAAAEAgBAEAABAgAAAAgEAIEgAAAEAABAEAAAAgAAQAgEAAAgAAAAAAAAEAgAAAAAQAgAAAAgAAAAAAAAEAgAAAAAQAgAAAAgAAAAAACAEAAAAAAAQAAAAAAgEAAAAACAEAAAAAAgQAAAAQAgAAAAAACAQAABAAAAQAAAAQAAAAIAAACAQAACAAAAQAAAAQCAAAIAAACAAAACAAAAQAAAAQCAAAAAAACAAAACAQAAAAAAAQAAAAAAAACAAAACAAAAAAAAAQAAAAQCAAAAAAACAAAACAQAAQAAAAQAAAAAAAACAAAACAQAAAAAAAQAAAAQCAAAAAAACAAAAAAAAAQAAAAQAAAAAAAACAAAAAAAAAQAAAAQAAAAAAAACAAAACAAAAQAAAAQAAAAAAAACAAAACAAAAAAAAAQAAAAAAAAAAAAACAAAAAAAAAQAAAAAAAAAAAAACAAAAAAAAAAAAAAAABAAAAAACAAAAAAAIAAAAAAAABAAAAAAAAAAAAAAIAAAAACAABAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAEAIAAAAAAAABAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAABAAAAAAAAAAAAAAIAAAAAAAAAAAAABAAAAAAAAAAAAAAIABAQAAAIAAAAKAEhICAEABQAkJAQIgIKQEhJKREhJSAEhJSAkpKSAkIKQElpaRElJSQkhJSAkpKSMkIKSUlpaT0lJbW0lBaekpPSekpLa2lp7T0lp7W0nJaWktPaektLa2n57S0npfS03t6Wk9P6ek9PaXnt/y8np/z83t+zs/v+Xk/v+fn9fyen/fz+3p+z8/7/X0/r+f3/b6fn9/7+35ez8/r+T2/v+f3//ye39/7+35//+//////////////////",Ee="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAEAAAAEAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAgAEAAgAAAEAIgAEAIgAEAEAAgBEAAgAEAEgIkAEAIAAEAAAAkBEAAgAAAEgIkAEAIAAEAAAAgBEgAgAAAEgAgAEgIgAEAAAAkBEAAgAAAEgAAAEgIgAEQAAAgBEAAgAEAEiAAAEAIgAEAAAAkQEAAgAEAEgAAAEgIgAEAAgAkQAAAgQEQEgAEAEiAgAEAAiAkQAAAAAEQEgAEAAiAAAECAiAkAAAAgQAQEgAEQAiAAAECAAAEBAAAAQAQIAAAAAgAAAACAAAEBAAAAAAAAAAAAIgIAAAAAAAABAAAAAAAAAAAAIAIAAACAABABAAAAAAAAAAAAIAIAAAAACAAAAAAAAAAAAQAQIAIAAACAAAAAAABAQAAAAAAAIAAAQICAAAAAAAAAAAAAAAAAIAAAAAAAAAACAABAAAAAAQAAIAAABAAAAAACAABAAAAIAQAAIAAABIAAAAACAABAAAAJAAAAAAAABIAAABACAABAAAAJAAAAAAAABIAAABACAABAAAAIAQAAAAAABAAAABACAABAAAAIAQAAAAAABICAABACAABAAAAJAYCAIBACBIDAQBILAQBAIAAJBYCAIBIGBIBAQBILAQBAICANBYCAIBISBIBAQBILAQBAICANBICAIBISBIBAQBILCQBAICAtBICAIBIWBIBAQBoJAQBAICAtBICAIBIWAIBAQFoJAQBAICANBICAkBIWAIBAQFoJAQFAICgFBICAkBIWAoBAQBoJBQFAICgEBISAEBIGAoBAUBoJDUEgICgEBISgMBIKgoBAUBgJCUAgIBgEBISgEBIagsBAUBgJCUAgICAEBISgEBISgMBAUBgJCUAgICAMBICgMBISgMBAQBgJCUAgICEEhICAMBIWgMBAQAgJAUBgICEEhIDAMBISgEBAQggJAQBgICEFhIDAEBICgEBAQgkJAQBgICEEhICAEBICAEBAQgkJAYBgIAEEhICAEBYCAEBAAgkJAQAgIAAEhICAEBYHAMBAAgkJAQAgIAAEhICAEhYCAEBAAAkJAQAgKAIEhIAAEhICAEBAAAkNAQAgIAIEhIAAEhICAEBAAAkNAQAgMAAFhIAAEhoCAEBQAAkJAAAgOAQEhIgAEhoAAEBwAAkJEAAgMAQEhOgAEhIAAEBwAAkJEAAgIAQEgKAAEhIgAEBQAAkJ0AAgIAQEgKAAEhIgAEBAAAkB0AAgIAQEgKAAEgKgAEBAAAkBQAAgIEAEgIAAEgOgAEBAAAkBQAAgAUAEgIAAEgKAAEBAgAgBAAAgAUAEgIAAEAKAAEBCgAgBAAAgAUAEgIEAEAAAAEACgAgBAAAgAEAEgIEAFAAAAEACgAEAAgAgAAAAAIEABAAAAFAAgAEAAgIoAAAAgAEAAAAAAEQAgAABAgIIAAAAoAEAAAAAABQEAAABAgIAAAAAiAEAAAAAABQEgAAQAgAAAAAAKAkAAAIgABQAgAEQAgAAAAAACAkAAAIgAAQAgAFQEgAAAEAACAEAAKAgAAQAgAAQEgAAAAAECAEAAKAgAAQAgAAQAgAAAEAACAEAACAgAAQAgAAQAgABQAAACAEAACAgAAQAAAAQAgAAQEAACAEAACAAAAaAAAAQAgAAQEAACAAAACAAAASAgAAQAgAAQAAACQAEACAAAASAgAAQAgAAQAAACQAEACAAAASAAAAQAAgAQAAACQAAACAAAASAACASAAgAQAAACQAAACAAEACAAAASAAAAQAAACQAAACAAAACAAAAQAAAAQAAAAQAAACAAAACAAAASAAAAQAAAAQAAACAAAACAACACAAAAQAAAAQAAACAABACAAAACAAAAQAAAAQAAAAAABACAAAACAAAAQAAAAQAAAAAABACAAAACAAAAAAAIAQAAAAAABACAAAACAAAAAAAIAQAAAAAABAAAAAACAAAAAAAIAAAAAAAABAAAABACAAAAAAAIAAAAAAAABAAAABAAAAAAAAAIAAAAAAAABAAAABgAAAAAAAAIAAAAIAAAAAAAABAAAAAAAAAIAAAAIAAAAAAAABAAAAAAAAAAAAAAIAAAAAAAABAAAABAAAAAAAAAIAAAAAAAAAAAAABAAAAAAAAAIAAAAAAAAAAAAABAAAAAAAAAIAAAAIAAAAAAAABAAAAAAAAAAAAAAIAAAAAAAABAAAAAAAAAAAAAAIAAAAAAAAAAAAABAAAAAAAAAIAAAAAAAAAAAAABAAAAAAAAAIAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";var we=[[62,-6.9],[43.74,7.42],[41.9,12.45]],uA=Math.PI/180;function Z(a,A,t=1){let n=a*uA,i=A*uA;return new d(t*Math.cos(n)*Math.sin(i),t*Math.sin(n),t*Math.cos(n)*Math.cos(i))}function me(a){let A=atob(a),t=new Uint8Array(A.length);for(let n=0;n<A.length;n++)t[n]=A.charCodeAt(n);return n=>t[n>>3]>>(n&7)&1}function FA(a){return getComputedStyle(document.documentElement).getPropertyValue(a).trim()}function Ze(a,A){let t=a.querySelector("canvas"),n=a.querySelector(".globe-tip"),i=matchMedia("(prefers-reduced-motion: reduce)").matches,c=new ie({canvas:t,antialias:!0,alpha:!0});c.setPixelRatio(Math.min(devicePixelRatio,2));let g=new oe,s=new te(30,1,.1,100);s.position.set(0,0,4.4);let l=new ne;g.add(l);let B=me(he),m=me(Ee),h=[],I=[],hA=Math.PI*(3-Math.sqrt(5));for(let e=0;e<36e3;e++){if(!B(e))continue;let o=1-2*(e+.5)/36e3,r=Math.sqrt(1-o*o),E=hA*e;h.push(Math.sin(E)*r,o,Math.cos(E)*r),I.push(m(e))}for(let[e,o]of we){let r=Z(e,o);h.push(r.x,r.y,r.z),I.push(1)}let X=new wA;X.setAttribute("position",new W(new Float32Array(h),3)),X.setAttribute("kind",new W(new Float32Array(I),1));let U=new q({transparent:!0,depthTest:!1,depthWrite:!1,uniforms:{land:{value:new aA},seen:{value:new aA},size:{value:2},back:{value:.07}},vertexShader:`
      attribute float kind; uniform float size; varying float vKind; varying float vFace;
      void main() {
        vKind = kind;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(mat3(modelViewMatrix) * position);
        vFace = dot(n, normalize(-mv.xyz));
        gl_PointSize = size * (kind > 0.5 ? 1.3 : 1.0) * mix(0.55, 1.0, smoothstep(0.0, 0.5, vFace));
        gl_Position = projectionMatrix * mv;
      }`,fragmentShader:`
      uniform vec3 land; uniform vec3 seen; uniform float back; varying float vKind; varying float vFace;
      void main() {
        vec2 c = gl_PointCoord - 0.5; float d = length(c);
        if (d > 0.5) discard;
        float edge = smoothstep(0.5, 0.36, d);
        float a = mix(back, 1.0, smoothstep(0.12, 0.55, vFace));
        gl_FragColor = vec4(mix(land, seen, vKind), a * edge * (vKind > 0.5 ? 1.0 : 0.6));
      }`}),L=new KA(X,U);L.renderOrder=0,l.add(L);let N=new cA(new re(.995,48,32),new ee({colorWrite:!1}));N.renderOrder=1,l.add(N);let b=[],x=[],S=new q({transparent:!0,depthTest:!0,uniforms:{color:{value:new aA},size:{value:7},time:{value:0}},vertexShader:`
      attribute float first; attribute float trip; uniform float size; uniform float time;
      varying float vFirst; varying float vTrip;
      void main() {
        vFirst = first; vTrip = trip;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (first > 0.5 ? 1.0 + 0.25 * sin(time * 2.4) : 0.62);
        gl_Position = projectionMatrix * mv;
      }`,fragmentShader:`
      uniform vec3 color; varying float vFirst; varying float vTrip;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float ring = smoothstep(0.5, 0.42, d) * smoothstep(0.22, 0.3, d);
        float core = smoothstep(0.22, 0.14, d);
        float a = vFirst > 0.5 ? max(ring, core) : smoothstep(0.5, 0.35, d);
        gl_FragColor = vec4(color, a);
      }`}),zA=[],RA=[],EA=[];A.forEach((e,o)=>{let r=[];e.route.forEach(([nA,iA],P)=>{let oA=Z(nA,iA,1.004);if(zA.push(oA.x,oA.y,oA.z),RA.push(P===0?1:0),EA.push(o),P>0){let YA=Z(...e.route[P-1]),jA=Z(nA,iA),HA=YA.angleTo(jA),ZA=Math.max(2,Math.ceil(HA/(.6*uA)));for(let JA=1;JA<=ZA;JA++){let XA=JA/ZA,ye=new d().copy(YA).lerp(jA,XA).normalize(),Ue=1.004+Math.sin(Math.PI*XA)*Math.min(.06,HA*.35);r.push(...ye.multiplyScalar(Ue).toArray())}}else r.push(...oA.toArray())}),r.length<6&&r.push(...r);let E=new G;E.setPositions(r);let O=new w({linewidth:1.6,transparent:!0,opacity:.9,worldUnits:!1}),qA=new fA(E,O);qA.renderOrder=2,l.add(qA),b.push(O),e.center=e.route.reduce((nA,[iA,P])=>nA.add(Z(iA,P)),new d).normalize()});let $=new wA;$.setAttribute("position",new W(new Float32Array(zA),3)),$.setAttribute("first",new W(new Float32Array(RA),1)),$.setAttribute("trip",new W(new Float32Array(EA),1));let BA=new KA($,S);BA.renderOrder=3,l.add(BA);function mA(){U.uniforms.land.value.set(FA("--faint")||"#a19e96"),U.uniforms.seen.value.set(FA("--fg")||"#1a1a18");let e=FA("--accent")||"#b5542d";S.uniforms.color.value.set(e),b.forEach(o=>o.color.set(e)),U.uniforms.back.value=document.documentElement.style.colorScheme==="dark"||getComputedStyle(document.documentElement).colorScheme==="dark"?.05:.035,UA()}new MutationObserver(mA).observe(document.documentElement,{attributes:!0,attributeFilter:["data-theme"]}),matchMedia("(prefers-color-scheme: dark)").addEventListener("change",mA);let WA=new K,_A=new K;function Se(e){let o=Math.atan2(e.x,e.z),r=Math.asin(e.y),E=new K().setFromAxisAngle(new d(0,1,0),-o);return new K().setFromAxisAngle(new d(1,0,0),r*.85).multiply(E)}let T=0,V=0,AA=.6,F=-1,SA=performance.now();T=-(12*uA);function GA(){let e=new K().setFromAxisAngle(new d(0,1,0),T);return new K().setFromAxisAngle(new d(1,0,0),AA).multiply(e)}l.quaternion.copy(GA());let y=!1,IA=0,CA=0,QA=0;t.addEventListener("pointerdown",e=>{y=!0,QA=0,IA=e.clientX,CA=e.clientY,V=0,F=-1,t.setPointerCapture(e.pointerId),J()}),t.addEventListener("pointermove",e=>{if(y){let o=e.clientX-IA,r=e.clientY-CA;QA+=Math.abs(o)+Math.abs(r),T+=o*.006,V=o*.006,AA=Math.max(-.9,Math.min(.9,AA+r*.004)),IA=e.clientX,CA=e.clientY,SA=performance.now(),J()}else Ce(e)});let Ie=e=>{y&&(y=!1,QA<6&&Qe(e))};t.addEventListener("pointerup",Ie),t.addEventListener("pointercancel",()=>{y=!1}),t.addEventListener("pointerleave",()=>{y||OA(-1)});let eA=new ce;eA.params.Points.threshold=.035;let LA=new rA;function NA(e){let o=t.getBoundingClientRect();LA.set((e.clientX-o.left)/o.width*2-1,-((e.clientY-o.top)/o.height)*2+1),eA.setFromCamera(LA,s);let r=eA.intersectObject(BA)[0];if(!r)return-1;let E=eA.intersectObject(N)[0];return E&&E.distance<r.distance-.02?-1:EA[r.index]}let VA=-1;function Ce(e){let o=NA(e);t.style.cursor=o>=0?"pointer":"grab",o!==VA?(VA=o,OA(o,e),tA(o)):o>=0&&PA(e)}function Qe(e){let o=NA(e);o>=0&&(location.href=A[o].url)}function OA(e,o){if(e<0){n.hidden=!0,tA(-1);return}n.innerHTML='<span class="kicker">'+A[e].when+"</span>"+A[e].title,n.hidden=!1,o&&PA(o)}function PA(e){let o=a.getBoundingClientRect();n.style.transform=`translate(${e.clientX-o.left+14}px, ${e.clientY-o.top+14}px)`}function tA(e){b.forEach((o,r)=>{o.opacity=e<0||r===e?.9:.25,o.linewidth=r===e?2.4:1.6}),J()}document.querySelectorAll("a.entry[href]").forEach(e=>{let o=A.findIndex(O=>e.getAttribute("href")===O.url);if(o<0)return;let r=()=>{F=o,tA(o),J()},E=()=>{F=-1,tA(-1),SA=performance.now()};e.addEventListener("mouseenter",r),e.addEventListener("focus",r),e.addEventListener("mouseleave",E),e.addEventListener("blur",E)});let vA=0,z=!0,yA=performance.now();function DA(){let e=t.clientWidth,o=t.clientHeight;if(!e||!o)return;c.setSize(e,o,!1),s.aspect=e/o,s.updateProjectionMatrix();let r=c.getPixelRatio();U.uniforms.size.value=Math.max(1.6,o/230)*r,S.uniforms.size.value=Math.max(6,o/55)*r,b.forEach(E=>E.resolution.set(e*r,o*r)),UA()}function UA(){c.render(g,s)}function ve(e){vA=0;let o=Math.min(.05,(e-yA)/1e3);if(yA=e,S.uniforms.time.value=e/1e3,F>=0){WA.copy(Se(A[F].center)),l.quaternion.slerp(WA,1-Math.exp(-o*5));let r=new d(0,0,1).applyQuaternion(l.quaternion.clone().invert());T=-Math.atan2(r.x,r.z),AA=Math.asin(r.y)}else y||(V*=Math.exp(-o*3),T+=V,!i&&e-SA>1500&&(T+=o*.07)),_A.copy(GA()),l.quaternion.slerp(_A,y?1:1-Math.exp(-o*12));UA(),z&&(!i||y||F>=0||Math.abs(V)>1e-4)&&J()}function J(){!vA&&z&&(yA=performance.now(),vA=requestAnimationFrame(ve))}new ResizeObserver(DA).observe(t),new IntersectionObserver(([e])=>{z=e.isIntersecting&&!document.hidden,z&&J()}).observe(t),document.addEventListener("visibilitychange",()=>{z=!document.hidden,z&&J()}),mA(),DA(),J(),a.classList.add("is-ready")}export{Ze as mountGlobe};
