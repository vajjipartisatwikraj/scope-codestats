@echo off
REM Deploy script for the profile update scheduled task on Windows
REM This script sets up the task to run at 2:00 AM IST every day

REM Get current directory
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."
set "FULL_PATH=%PROJECT_ROOT%\scripts\updateUserProfiles.js"
cd /d "%PROJECT_ROOT%"

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js is not installed.
    exit /b 1
)

REM Install required dependencies
echo Installing required dependencies...
call npm install node-cron

REM Create logs directory
if not exist "%PROJECT_ROOT%\logs" mkdir "%PROJECT_ROOT%\logs"
echo Created logs directory at %PROJECT_ROOT%\logs

REM Create task to run at 2:00 AM IST (20:30 UTC previous day)
echo Creating Windows Scheduled Task...

REM Create a temporary XML file for the task
set "TEMP_XML=%TEMP%\profile_update_task.xml"
(
  echo ^<?xml version="1.0" encoding="UTF-16"?^>
  echo ^<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task"^>
  echo   ^<RegistrationInfo^>
  echo     ^<Description^>Update user coding profiles daily at 2:00 AM IST^</Description^>
  echo   ^</RegistrationInfo^>
  echo   ^<Triggers^>
  echo     ^<CalendarTrigger^>
  echo       ^<StartBoundary^>2023-01-01T20:30:00^</StartBoundary^>
  echo       ^<Enabled^>true^</Enabled^>
  echo       ^<ScheduleByDay^>
  echo         ^<DaysInterval^>1^</DaysInterval^>
  echo       ^</ScheduleByDay^>
  echo     ^</CalendarTrigger^>
  echo   ^</Triggers^>
  echo   ^<Principals^>
  echo     ^<Principal id="Author"^>
  echo       ^<LogonType^>InteractiveToken^</LogonType^>
  echo       ^<RunLevel^>LeastPrivilege^</RunLevel^>
  echo     ^</Principal^>
  echo   ^</Principals^>
  echo   ^<Settings^>
  echo     ^<MultipleInstancesPolicy^>IgnoreNew^</MultipleInstancesPolicy^>
  echo     ^<DisallowStartIfOnBatteries^>false^</DisallowStartIfOnBatteries^>
  echo     ^<StopIfGoingOnBatteries^>false^</StopIfGoingOnBatteries^>
  echo     ^<AllowHardTerminate^>true^</AllowHardTerminate^>
  echo     ^<StartWhenAvailable^>true^</StartWhenAvailable^>
  echo     ^<RunOnlyIfNetworkAvailable^>true^</RunOnlyIfNetworkAvailable^>
  echo     ^<IdleSettings^>
  echo       ^<StopOnIdleEnd^>false^</StopOnIdleEnd^>
  echo       ^<RestartOnIdle^>false^</RestartOnIdle^>
  echo     ^</IdleSettings^>
  echo     ^<AllowStartOnDemand^>true^</AllowStartOnDemand^>
  echo     ^<Enabled^>true^</Enabled^>
  echo     ^<Hidden^>false^</Hidden^>
  echo     ^<RunOnlyIfIdle^>false^</RunOnlyIfIdle^>
  echo     ^<WakeToRun^>false^</WakeToRun^>
  echo     ^<ExecutionTimeLimit^>PT1H^</ExecutionTimeLimit^>
  echo     ^<Priority^>7^</Priority^>
  echo   ^</Settings^>
  echo   ^<Actions Context="Author"^>
  echo     ^<Exec^>
  echo       ^<Command^>node^</Command^>
  echo       ^<Arguments^>"%FULL_PATH%" ^&gt;^&gt; "%PROJECT_ROOT%\logs\cron-update.log" 2^&gt;^&1^</Arguments^>
  echo       ^<WorkingDirectory^>%PROJECT_ROOT%^</WorkingDirectory^>
  echo     ^</Exec^>
  echo   ^</Actions^>
  echo ^</Task^>
) > "%TEMP_XML%"

REM Create or replace the task
schtasks /create /tn "CP Tracker Profile Update" /xml "%TEMP_XML%" /f

REM Check if task was created successfully
if %ERRORLEVEL% NEQ 0 (
    echo Error: Failed to create scheduled task.
    del "%TEMP_XML%"
    exit /b 1
)

REM Clean up
del "%TEMP_XML%"

REM Create a test log entry to confirm setup
echo %DATE% %TIME% - Scheduled task setup complete > "%PROJECT_ROOT%\logs\setup.log"

echo Scheduled task successfully created to run at 2:00 AM IST (20:30 UTC) every day.
echo Logs will be available in %PROJECT_ROOT%\logs\
echo You can test the job by running: node %PROJECT_ROOT%\scripts\runProfileUpdate.js

exit /b 0 