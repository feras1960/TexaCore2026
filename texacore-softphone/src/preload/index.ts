import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  onCallStateChanged: (callback: (state: any) => void) => ipcRenderer.on('call-state-changed', (_event, value) => callback(value)),
  makeCall: (target: string) => ipcRenderer.invoke('make-call', target),
  answerCall: () => ipcRenderer.invoke('answer-call'),
  hangupCall: () => ipcRenderer.invoke('hangup-call'),
});
