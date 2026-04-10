export interface AppAlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AppAlertOptions {
  variant?: 'info' | 'success' | 'destructive' | 'confirmation';
  cancelable?: boolean;
}

export interface AppAlertConfig {
  id: string; // Internal tracking to ensure correct dismissals
  title: string;
  message?: string | null;
  buttons?: AppAlertButton[];
  options?: AppAlertOptions;
}

type Subscriber = (config: AppAlertConfig | null) => void;

class AppAlertClass {
  private currentConfig: AppAlertConfig | null = null;
  private subscribers: Set<Subscriber> = new Set();
  private nextId = 0;

  /**
   * Identical signature to `Alert.alert`, but with custom variant options via `options`.
   */
  alert(
    title: string,
    message?: string | null,
    buttons?: AppAlertButton[],
    options?: AppAlertOptions,
  ) {
    const id = `alert-${this.nextId++}`;
    this.currentConfig = { id, title, message, buttons, options };
    this.notify();
  }

  show(
    title: string,
    message?: string | null,
    buttons?: AppAlertButton[],
    options?: AppAlertOptions,
  ) {
    this.alert(title, message, buttons, options);
  }

  hide() {
    this.currentConfig = null;
    this.notify();
  }

  subscribe(callback: Subscriber) {
    this.subscribers.add(callback);
    // Emit immediate current state
    callback(this.currentConfig);
    return () => this.subscribers.delete(callback);
  }

  private notify() {
    this.subscribers.forEach(sub => sub(this.currentConfig));
  }
}

export const AppAlert = new AppAlertClass();
