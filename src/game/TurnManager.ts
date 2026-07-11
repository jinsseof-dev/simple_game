export type TurnState = 'PLAYER_TURN' | 'ENEMY_TURN' | 'ANIMATING';

export class TurnManager {
  private currentState: TurnState = 'PLAYER_TURN';
  private currentTurnNumber: number = 1;
  private onStateChangeCallbacks: ((state: TurnState, turnNumber: number) => void)[] = [];

  constructor() {
    // Initial UI state setup will happen when bound
  }

  public getState(): TurnState {
    return this.currentState;
  }

  public getTurnNumber(): number {
    return this.currentTurnNumber;
  }

  /**
   * Register a callback for when the turn state changes.
   */
  public onStateChange(callback: (state: TurnState, turnNumber: number) => void) {
    this.onStateChangeCallbacks.push(callback);
    // Immediately call once to sync initial state
    callback(this.currentState, this.currentTurnNumber);
  }

  /**
   * Set turn state and notify subscribers
   */
  public setState(state: TurnState) {
    this.currentState = state;
    this.notifySubscribers();
  }

  /**
   * End player turn and transition to enemy turn
   */
  public endPlayerTurn() {
    if (this.currentState !== 'PLAYER_TURN') return;
    
    this.setState('ENEMY_TURN');
  }

  /**
   * End enemy turn, increment turn counter, and transition back to player
   */
  public endEnemyTurn() {
    if (this.currentState !== 'ENEMY_TURN') return;

    this.currentTurnNumber++;
    this.setState('PLAYER_TURN');
  }

  public reset() {
    this.currentState = 'PLAYER_TURN';
    this.currentTurnNumber = 1;
    this.notifySubscribers();
  }

  private notifySubscribers() {
    this.onStateChangeCallbacks.forEach(cb => cb(this.currentState, this.currentTurnNumber));
  }
}
