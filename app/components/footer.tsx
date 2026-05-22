import { Github } from "lucide-react";
import { XGlyph } from "./brand-icons";
import { LandingFooterPoweredBySvg } from "./svg-icons";

function Footer() {
  return (
    <div className="w-full py-6">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <a
          href="https://together.ai"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Powered by together.ai"
          className="interactive inline-flex items-center rounded-full"
        >
          <LandingFooterPoweredBySvg className="h-7 w-auto" />
        </a>
        <div className="flex items-center gap-2">
          <a
            href="https://github.com/Nutlope/pdf-to-interactive-lesson"
            target="_blank"
            rel="noopener noreferrer"
            className="interactive w-8 h-8 rounded-full bg-surface-muted border border-border flex items-center justify-center text-neutral-600 hover:text-neutral-900"
            aria-label="GitHub"
          >
            <Github className="w-4 h-4" />
          </a>
          <a
            href="https://x.com/nutlope"
            target="_blank"
            rel="noopener noreferrer"
            className="interactive w-8 h-8 rounded-full bg-surface-muted border border-border flex items-center justify-center text-neutral-600 hover:text-neutral-900"
            aria-label="X (Twitter)"
          >
            <XGlyph className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

export { Footer };
