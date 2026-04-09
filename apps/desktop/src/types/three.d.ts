declare module "three" {
  export * from "three/build/three.module.js";
}

declare module "three/examples/jsm/controls/OrbitControls" {
  import { Controls } from "three";
  export class OrbitControls extends Controls {}
}

declare module "three/examples/jsm/loaders/GLTFLoader" {
  import { Loader } from "three";
  export class GLTFLoader extends Loader {}
}

declare module "three/examples/jsm/loaders/DRACOLoader" {
  import { Loader } from "three";
  export class DRACOLoader extends Loader {}
}

declare module "three/examples/jsm/loaders/FBXLoader" {
  import { Loader } from "three";
  export class FBXLoader extends Loader {}
}

declare module "three/examples/jsm/loaders/USDZLoader" {
  import { Loader } from "three";
  export class USDZLoader extends Loader {}
}
