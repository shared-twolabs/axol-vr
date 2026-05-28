import type { QuaternionLike, Vector3Like } from "three"

export enum AxolState {
  Teleop = "teleop",
  DataCollection = "data_collection",
  Recording = "recording",
  Saving = "saving",
  Error = "error",
}

export enum AxolConnectionStatus {
  Idle = "idle",
  Connecting = "connecting",
  Open = "open",
  Error = "error",
  Failed = "failed",
}

export type AxolPoseData = {
  l_ee: { position: Vector3Like; quaternion: QuaternionLike }
  r_ee: { position: Vector3Like; quaternion: QuaternionLike }
  l_elbow: Vector3Like
  r_elbow: Vector3Like
  l_lock: boolean
  r_lock: boolean
  l_grip: number
  r_grip: number
  reset: boolean
  state: AxolState
  /**
   * Teleop motion multiplier sent every frame.
   * 1.0 = identity (default; VR motion maps 1:1 to arm motion).
   * <1   = small VR motions map to large arm motions (clutched-in tighter).
   * >1   = large VR motions map to small arm motions (finer control).
   *
   * Snake-case key matches the Python VRFrame schema; the server is free
   * to ignore the field until it knows about it (additive, backwards-compatible).
   */
  motion_scale: number
}
