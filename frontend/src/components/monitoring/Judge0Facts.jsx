import React from 'react';
import { Card, EmptyState, formatNumber } from '../ui';
import { formatKilobytes, formatSeconds, humanSize } from './monitoringModel';

const dash = '\u2013';
const on = (value) => (value ? 'On' : 'Off');

/** "5 s (up to 15 s)": the default a submission gets and the most it may ask for. */
const withMax = (value, max, format) =>
  value === undefined ? undefined : max === undefined ? format(value) : `${format(value)} (up to ${format(max)})`;

/** A list of label and value rows; rows whose value is undefined (an older Judge0 lacks it) are left out. */
function Facts({ rows }) {
  return (
    <dl className="mon-facts mon-facts--columns">
      {rows
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([label, value]) => (
          <div key={label} className="mon-facts__row">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
    </dl>
  );
}

/**
 * What Judge0 enforces on every program (its /config_info): time, memory, stack, processes, file
 * size, runs, the queue size and what a submission may switch on. Defaults are what a submission
 * gets; "up to" is the most it may ask for.
 *
 *   limits    Judge0's config_info answer (null when that report failed)
 *   problem   why it is missing
 */
export function LimitsCard({ limits, problem }) {
  if (!limits) {
    return (
      <Card title="Execution limits" description="What Judge0 allows a program to use." className="mon-judge">
        <EmptyState compact title="This report is not available" text={problem || 'Judge0 did not send it.'} />
      </Card>
    );
  }

  const l = limits;
  const rows = [
    ['CPU time', withMax(l.cpu_time_limit, l.max_cpu_time_limit, formatSeconds)],
    ['Extra time before killing', withMax(l.cpu_extra_time, l.max_cpu_extra_time, formatSeconds)],
    ['Wall-clock time', withMax(l.wall_time_limit, l.max_wall_time_limit, formatSeconds)],
    ['Memory', withMax(l.memory_limit, l.max_memory_limit, formatKilobytes)],
    ['Stack', withMax(l.stack_limit, l.max_stack_limit, formatKilobytes)],
    ['Processes and threads', withMax(l.max_processes_and_or_threads, l.max_max_processes_and_or_threads, formatNumber)],
    ['File size', withMax(l.max_file_size, l.max_max_file_size, formatKilobytes)],
    ['Runs per submission', withMax(l.number_of_runs, l.max_number_of_runs, formatNumber)],
    ['Queue size limit', l.max_queue_size === undefined ? undefined : `${formatNumber(l.max_queue_size)} submissions`],
    ['Submissions per batch', l.enable_batched_submissions ? `Up to ${formatNumber(l.max_submission_batch_size)}` : l.enable_batched_submissions === undefined ? undefined : 'Off'],
    ['Network for programs', l.enable_network === undefined ? undefined : l.enable_network ? 'On' : l.allow_enable_network ? 'Off (a submission may ask)' : 'Off'],
    ['Compiler options', l.enable_compiler_options === undefined ? undefined : on(l.enable_compiler_options)],
    ['Command-line arguments', l.enable_command_line_arguments === undefined ? undefined : on(l.enable_command_line_arguments)],
    ['Additional files', l.enable_additional_files === undefined ? undefined : on(l.enable_additional_files)],
    ['Wait for the result', l.enable_wait_result === undefined ? undefined : on(l.enable_wait_result)],
    ['Callbacks', l.enable_callbacks === undefined ? undefined : l.enable_callbacks ? `On, ${l.callbacks_max_tries} tries` : 'Off'],
    ['Delete submissions', l.enable_submission_delete === undefined ? undefined : on(l.enable_submission_delete)],
  ];

  return (
    <Card title="Execution limits" description="What Judge0 allows a program to use." className="mon-judge">
      <Facts rows={rows} />
    </Card>
  );
}

/**
 * The machine Judge0's web server runs on (its /system_info: the output of lscpu and free). The
 * workers that run programs may be on other machines, so this describes the web server only.
 *
 *   system    the normalised server answer (null when that report failed)
 *   version   Judge0's version
 *   isolate   the sandbox's version
 *   problem   why `system` is missing
 */
export function ServerCard({ system, version, isolate, problem }) {
  const rows = [
    ['Judge0 version', version || undefined],
    ['Sandbox (isolate)', isolate || undefined],
    ...(system
      ? [
          ['Processor', system.cpuModel || dash],
          ['CPUs', system.cpus === null ? dash : formatNumber(system.cpus)],
          ['Threads per core', system.threadsPerCore === null ? undefined : formatNumber(system.threadsPerCore)],
          ['Cores per socket', system.coresPerSocket === null ? undefined : formatNumber(system.coresPerSocket)],
          ['Clock', system.mhz === null ? undefined : `${formatNumber(Math.round(system.mhz))} MHz`],
          ['Architecture', system.architecture || undefined],
          ['Virtualisation', system.hypervisor || undefined],
          ['Memory', system.memory ? humanSize(system.memory) : dash],
          ['Swap', system.swap ? humanSize(system.swap) : undefined],
          ['Cache (L1 data / L2 / L3)', system.caches?.l1d ? `${system.caches.l1d} / ${system.caches.l2 || dash} / ${system.caches.l3 || dash}` : undefined],
        ]
      : []),
  ];

  return (
    <Card title="Server" description="The machine Judge0's web server runs on." className="mon-judge">
      <Facts rows={rows} />
      {!system && problem ? <p className="mon-note">Server details are not available: {problem}</p> : null}
      {system ? <p className="mon-note">The workers that run programs can be on other machines, so this may not describe them.</p> : null}
    </Card>
  );
}
