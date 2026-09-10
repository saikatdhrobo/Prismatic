import * as React from "react";

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError:boolean; error?:Error }> {
  constructor(props:any){ super(props); this.state={ hasError:false }; }
  static getDerivedStateFromError(error:Error){ return { hasError:true, error }; }
  componentDidCatch(error:Error, info:any){ console.error("ErrorBoundary", error, info); }
  render(){
    if (this.state.hasError) {
      return <div className="p-8 max-w-xl mx-auto text-center space-y-3">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="text-sm text-muted-foreground">{this.state.error?.message ?? "Unknown error"}</p>
        <button onClick={()=> window.location.reload()} className="rounded-md border px-3 py-2 text-sm hover:bg-accent">Reload</button>
      </div>;
    }
    return this.props.children;
  }
}
