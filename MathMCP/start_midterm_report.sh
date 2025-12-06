#!/bin/bash

# MCP Math Service Midterm Report Launch Script

echo "🎓 Launching MCP Math Service Midterm Research Proposal..."
echo ""

# Check for Python
if command -v python3 &> /dev/null; then
    echo "✅ Starting local server with Python3"
    echo "📱 Report will be available at http://localhost:8081"
    echo "🔄 Press Ctrl+C to stop the server"
    echo ""
    echo "📋 Report Features:"
    echo "   • Apple-inspired design language"
    echo "   • Comprehensive research justification"
    echo "   • Interactive mathematical demonstrations"
    echo "   • Academic paper structure"
    echo "   • Technical architecture diagrams"
    echo ""
    python3 -m http.server 8081
elif command -v python &> /dev/null; then
    echo "✅ Starting local server with Python"
    echo "📱 Report will be available at http://localhost:8081"
    echo "🔄 Press Ctrl+C to stop the server"
    echo ""
    python -m http.server 8081
else
    echo "❌ Python not found, opening file directly"
    echo "💡 Install Python for better experience"
    echo ""
    echo "📁 File location: $(pwd)/midterm_report.html"
    
    # Try to open with system default browser
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        open midterm_report.html
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        xdg-open midterm_report.html
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        # Windows
        start midterm_report.html
    fi
fi

