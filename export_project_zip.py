import os
import zipfile

def create_zip(output_filename="medicare_project.zip"):
    # Exclude unnecessary / large directories and files
    exclude_dirs = {'node_modules', '.git', '__pycache__', '.vite', 'dist'}
    exclude_files = {'medicare_project.zip', 'package-lock.json', '.DS_Store'}

    with zipfile.ZipFile(output_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk('.'):
            # Modify dirs in-place to skip excluded directories
            dirs[:] = [d for d in dirs if d not in exclude_dirs and not d.startswith('.')]
            
            for file in files:
                if file in exclude_files or file.endswith('.pyc') or file.endswith('.zip') or file.endswith('.db'):
                    continue
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, '.')
                zipf.write(file_path, arcname)

    print(f"Created {output_filename} successfully.")

if __name__ == '__main__':
    create_zip()
