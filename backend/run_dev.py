
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        reload=True,
        reload_includes=["*.md"],
        port=8001,
    )