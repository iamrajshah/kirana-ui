/// <reference types="vite/client" />

declare module '@ionic/react-router' {
  import { ComponentType } from 'react';
  
  export interface IonReactRouterProps {
    children?: React.ReactNode;
  }
  
  export class IonReactRouter extends React.Component<IonReactRouterProps> {}
}
